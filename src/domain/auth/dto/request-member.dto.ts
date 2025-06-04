import { DecodedJwtDto } from './decoded-jwt.dto';

export interface RequestMember extends Request {
  user: DecodedJwtDto;
}