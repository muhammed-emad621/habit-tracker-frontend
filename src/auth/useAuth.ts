export const useAuth = () => {
  const token = localStorage.getItem("token");

  const isLoggedIn = !!token;

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return { isLoggedIn, logout };
};
