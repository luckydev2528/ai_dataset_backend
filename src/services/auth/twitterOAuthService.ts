import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { redisService } from '../cache/RedisService';

interface TwitterOAuthResult {
  accessToken: string;
  accessTokenSecret: string;
  userId: string;
  screenName: string;
  email?: string;
}

interface TwitterSession {
  oauthTokenSecret: string;
  deviceId: string | undefined;
  timestamp: number;
}

interface TwitterUserData {
  id: string;
  name: string;
  screen_name: string;
  email?: string;
  profile_image_url?: string;
}

export class TwitterOAuthService {
  private oauth: OAuth;
  private consumerKey: string;
  private consumerSecret: string;
  private callbackUrl: string;

  constructor() {
    this.consumerKey = process.env.TWITTER_CONSUMER_KEY!;
    this.consumerSecret = process.env.TWITTER_CONSUMER_SECRET!;
    this.callbackUrl = 'datarefining://twitter-callback';
    
    if (!this.consumerKey || !this.consumerSecret) {
      throw new Error('Twitter OAuth credentials not configured');
    }
    
    this.oauth = new OAuth({
      consumer: { 
        key: this.consumerKey, 
        secret: this.consumerSecret 
      },
      signature_method: 'HMAC-SHA1',
      hash_function: (baseString: string, key: string) => 
        crypto.createHmac('sha1', key).update(baseString).digest('base64')
    });
  }

  /**
   * Step 1: Initiate OAuth flow by getting request token
   */
  async initiateOAuth(deviceId?: string): Promise<{ authUrl: string; sessionId: string }> {
    console.log('🐦 Initiating Twitter OAuth flow...');
    
    try {
      // Step 1: Get request token
      const requestData = {
        url: 'https://api.twitter.com/oauth/request_token',
        method: 'POST',
        data: { oauth_callback: this.callbackUrl }
      };

      const authHeader = this.oauth.toHeader(this.oauth.authorize(requestData));

      const response = await fetch('https://api.twitter.com/oauth/request_token', {
        method: 'POST',
        headers: {
          'Authorization': authHeader.Authorization,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `oauth_callback=${encodeURIComponent(this.callbackUrl)}`
      });

      const responseText = await response.text();
      console.log('📝 Twitter request token response:', responseText);

      if (!response.ok) {
        throw new Error(`Twitter request token failed: ${responseText}`);
      }

      const params = new URLSearchParams(responseText);
      
      const oauthToken = params.get('oauth_token');
      const oauthTokenSecret = params.get('oauth_token_secret');
      const oauthCallbackConfirmed = params.get('oauth_callback_confirmed');
      
      if (!oauthToken || !oauthTokenSecret || oauthCallbackConfirmed !== 'true') {
        throw new Error('Invalid request token response from Twitter');
      }

      // Store session in Redis with 10 minute expiry
      const sessionId = crypto.randomUUID();
      const session: TwitterSession = {
        oauthTokenSecret,
        deviceId,
        timestamp: Date.now()
      };
      
      await redisService.set(
        `twitter_oauth:${sessionId}`, 
        JSON.stringify(session), 
        600 // 10 minutes
      );

      // Also store a mapping from oauth_token to sessionId for callback lookup
      await redisService.set(
        `twitter_token:${oauthToken}`,
        sessionId,
        600 // 10 minutes
      );

      const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`;
      
      console.log('✅ Twitter OAuth initiated successfully', { sessionId, authUrl });
      return { authUrl, sessionId };

    } catch (error: any) {
      console.error('❌ Twitter OAuth initiation failed:', error);
      throw new Error(`Failed to initiate Twitter OAuth: ${error.message}`);
    }
  }

  /**
   * Step 2: Handle callback from Twitter and exchange for access token
   */
  async handleCallback(
    oauthToken: string, 
    oauthVerifier: string
  ): Promise<{ result: TwitterOAuthResult; sessionId: string }> {
    console.log('🔄 Handling Twitter OAuth callback...', { oauthToken, oauthVerifier });

    try {
      // Find session by oauth token
      const sessionIdData = await redisService.get(`twitter_token:${oauthToken}`);
      const sessionId = typeof sessionIdData === 'string' ? sessionIdData : sessionIdData as string;
      
      if (!sessionId) {
        throw new Error('OAuth session not found or expired');
      }

      const sessionData = await redisService.get(`twitter_oauth:${sessionId}`);
      if (!sessionData) {
        throw new Error('OAuth session data not found');
      }

      // Handle both string and object responses from Redis
      const session = typeof sessionData === 'string' 
        ? JSON.parse(sessionData) as TwitterSession
        : sessionData as TwitterSession;

      // Exchange for access token
      const requestData = {
        url: 'https://api.twitter.com/oauth/access_token',
        method: 'POST',
        data: { oauth_verifier: oauthVerifier }
      };

      const token = { key: oauthToken, secret: session.oauthTokenSecret };
      const authHeader = this.oauth.toHeader(this.oauth.authorize(requestData, token));

      const response = await fetch('https://api.twitter.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Authorization': authHeader.Authorization,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `oauth_verifier=${oauthVerifier}`
      });

      const responseText = await response.text();
      console.log('📝 Twitter access token response:', responseText);

      if (!response.ok) {
        throw new Error(`Twitter access token failed: ${responseText}`);
      }

      const params = new URLSearchParams(responseText);
      
      const accessToken = params.get('oauth_token');
      const accessTokenSecret = params.get('oauth_token_secret');
      const userId = params.get('user_id');
      const screenName = params.get('screen_name');

      if (!accessToken || !accessTokenSecret || !userId || !screenName) {
        throw new Error('Invalid access token response from Twitter');
      }

      const result: TwitterOAuthResult = {
        accessToken,
        accessTokenSecret,
        userId,
        screenName
      };

      // Optionally get user data including email (requires special Twitter permissions)
      try {
        const userData = await this.getUserData(accessToken, accessTokenSecret);
        if (userData.email) {
          result.email = userData.email;
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch user email from Twitter (requires special permissions)');
        // Continue without email - it's optional
      }

      // Store result in Redis for frontend retrieval
      await redisService.set(
        `twitter_result:${sessionId}`,
        JSON.stringify(result),
        300 // 5 minutes
      );

      // Clean up temporary OAuth data
      await redisService.del(`twitter_oauth:${sessionId}`);
      await redisService.del(`twitter_token:${oauthToken}`);

      console.log('✅ Twitter OAuth callback handled successfully', { userId, screenName });
      return { result, sessionId };

    } catch (error: any) {
      console.error('❌ Twitter OAuth callback failed:', error);
      throw new Error(`Failed to handle Twitter callback: ${error.message}`);
    }
  }

  /**
   * Step 3: Get the OAuth result by session ID
   */
  async getResult(sessionId: string): Promise<TwitterOAuthResult | null> {
    console.log('🔍 Getting Twitter OAuth result for session:', sessionId);

    try {
      const data = await redisService.get(`twitter_result:${sessionId}`);
      if (!data) {
        console.warn('⚠️ Twitter OAuth result not found or expired for session:', sessionId);
        return null;
      }
      
      // Clean up after retrieval
      await redisService.del(`twitter_result:${sessionId}`);
      
      // Handle both string and object responses from Redis
      const result = typeof data === 'string' 
        ? JSON.parse(data) as TwitterOAuthResult
        : data as TwitterOAuthResult;
      console.log('✅ Twitter OAuth result retrieved successfully');
      return result;

    } catch (error: any) {
      console.error('❌ Failed to get Twitter OAuth result:', error);
      return null;
    }
  }

  /**
   * Get user data from Twitter API (optional - requires email permissions)
   */
  private async getUserData(accessToken: string, accessTokenSecret: string): Promise<TwitterUserData> {
    const requestData = {
      url: 'https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true',
      method: 'GET'
    };

    const token = { key: accessToken, secret: accessTokenSecret };
    const authHeader = this.oauth.toHeader(this.oauth.authorize(requestData, token));

    const response = await fetch(requestData.url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader.Authorization
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get user data: ${errorText}`);
    }

    const userData = await response.json();
    return {
      id: userData.id_str,
      name: userData.name,
      screen_name: userData.screen_name,
      email: userData.email,
      profile_image_url: userData.profile_image_url_https
    };
  }
}
