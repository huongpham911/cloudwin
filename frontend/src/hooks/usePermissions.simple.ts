import React from 'react';

// Mock permissions hook for now
export const usePermissions = () => {
    return {
        hasAllPermissions: () => true,
        hasAnyPermission: () => true,
    };
};

// Export a simple component
export const withPermissions = (Component: any, requiredPermissions: string[] = []) => {
    return (props: any) => {
        return React.createElement(Component, props);
    };
};
