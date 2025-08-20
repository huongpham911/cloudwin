export const usePermissions = () => {
  return {
    hasAllPermissions: () => true,
    hasAnyPermission: () => true,
  };
};

export const withPermissions = (Component: any) => {
  return Component;
};
