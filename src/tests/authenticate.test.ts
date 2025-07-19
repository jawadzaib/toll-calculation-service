import { authenticate } from '../middleware/authenticate';
import jwt from 'jsonwebtoken';

// Mock Express req/res/next
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authenticate middleware', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'secret';
  const userPayload = { username: 'agent1', interchange: 'NS Interchange' };
  let token: string;

  beforeAll(() => {
    token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' });
  });

  it('should return 401 if Authorization header and cookie are missing', () => {
    const req: any = { headers: {}, cookies: {} };
    const res = mockResponse();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Missing or invalid Authorization header.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if Authorization header is malformed and no cookie', () => {
    const req: any = { headers: { authorization: 'Token ' + token }, cookies: {} };
    const res = mockResponse();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Missing or invalid Authorization header.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid in header', () => {
    const req: any = { headers: { authorization: 'Bearer invalidtoken' }, cookies: {} };
    const res = mockResponse();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next and set req.user if token is valid in header', () => {
    const req: any = { headers: { authorization: 'Bearer ' + token }, cookies: {} };
    const res = mockResponse();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(req.user).toMatchObject(userPayload);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if token is expired in header', () => {
    const expiredToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: -1 });
    const req: any = { headers: { authorization: 'Bearer ' + expiredToken }, cookies: {} };
    const res = mockResponse();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next and set req.user if token is valid in cookie', () => {
    const req: any = { headers: {}, cookies: { token } };
    const res = mockResponse();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(req.user).toMatchObject(userPayload);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if token is invalid in cookie', () => {
    const req: any = { headers: {}, cookies: { token: 'invalidtoken' } };
    const res = mockResponse();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is expired in cookie', () => {
    const expiredToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: -1 });
    const req: any = { headers: {}, cookies: { token: expiredToken } };
    const res = mockResponse();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token.' });
    expect(next).not.toHaveBeenCalled();
  });
});