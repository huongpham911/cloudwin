import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sshKeyService, SSHKey, CreateSSHKeyRequest } from '../services/sshKeyService';
import { toast } from 'react-hot-toast';

export const useSSHKeys = () => {
  return useQuery({
    queryKey: ['ssh-keys'],
    queryFn: () => sshKeyService.getSSHKeys(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateSSHKey = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (keyData: CreateSSHKeyRequest) => sshKeyService.createSSHKey(keyData),
    onSuccess: (newKey) => {
      queryClient.invalidateQueries({ queryKey: ['ssh-keys'] });
      toast.success(`SSH key "${newKey.name}" created successfully!`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Failed to create SSH key';
      toast.error(message);
    },
  });
};

export const useDeleteSSHKey = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (keyId: number) => sshKeyService.deleteSSHKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssh-keys'] });
      toast.success('SSH key deleted successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Failed to delete SSH key';
      toast.error(message);
    },
  });
};

export const useUpdateSSHKey = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ keyId, name }: { keyId: number; name: string }) => 
      sshKeyService.updateSSHKey(keyId, name),
    onSuccess: (updatedKey) => {
      queryClient.invalidateQueries({ queryKey: ['ssh-keys'] });
      toast.success(`SSH key updated to "${updatedKey.name}"!`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Failed to update SSH key';
      toast.error(message);
    },
  });
};
