export interface IUserCookie {
  token: string;
  roles: string[];
}

export interface ICourseAdminCookie {
  token: string;
  email: string;
}
