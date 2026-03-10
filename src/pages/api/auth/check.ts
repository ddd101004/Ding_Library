import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/middleware/auth/withAuth';

const handler = async (req: NextApiRequest, res: NextApiResponse, userId: string) => {
  if (req.method === 'GET') {
    return res.status(200).json({
      code: 200,
      message: '认证有效',
      data: { 
        authenticated: true, 
        userId,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  return res.status(405).json({ 
    code: 405,
    message: '方法不允许' 
  });
};

export default withAuth(handler);