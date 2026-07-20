import { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { testResultsApi } from '../lib/api';

export function useAuthenticatedAttachmentUrl(attachmentId: string) {
  const { token } = useAuth();
  const [url, setUrl] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    if (!token || !attachmentId) {
      return undefined;
    }

    void testResultsApi.getAttachmentBlob(token, attachmentId)
      .then((blob) => {
        if (!active) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) {
          setUrl('');
        }
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [attachmentId, token]);

  return token ? url : '';
}
