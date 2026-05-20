import { Role } from '../enums/role.enum';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl: string | null;
  reportsTo: string | null;
  path: string;
  depth: number;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  reportsTo: string | null;
  path: string;
  depth: number;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}
