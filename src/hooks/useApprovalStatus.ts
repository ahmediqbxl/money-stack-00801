import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useApprovalStatus = () => {
  const { user } = useAuth();
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!user) {
        setApprovalStatus(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('approval_status')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setApprovalStatus(data?.approval_status || null);
      } catch (error) {
        console.error('Error checking approval status:', error);
        setApprovalStatus(null);
      } finally {
        setLoading(false);
      }
    };

    checkApprovalStatus();
  }, [user]);

  return { approvalStatus, loading };
};
