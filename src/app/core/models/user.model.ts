export enum Role {
  MEMBER       = 'MEMBER',
  TEAM_LEADER  = 'TEAM_LEADER',
  MANAGER      = 'MANAGER',
  HR           = 'HR',
  ORG_ADMIN    = 'ORG_ADMIN',
  SUPER_ADMIN  = 'SUPER_ADMIN',
}

export interface User {
  _id:            string;
  name:           string;
  email:          string;
  phone?:         string;
  avatar?:        string;
  role:           Role;
  organizationId: string;
  isActive:       boolean;
  emailVerified:  boolean;
  twoFactorEnabled: boolean;
  createdAt:      string;
  updatedAt:      string;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
}

export interface LoginRequest {
  email:    string;
  password: string;
}

export interface RegisterRequest {
  name:             string;
  email:            string;
  password:         string;
  organizationName: string;
  industry?:        string;
  size?:            string;
}
