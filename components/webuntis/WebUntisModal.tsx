'use client';

import React from 'react';
import { School } from 'lucide-react';
import type { WebUntisConfig } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { WebUntisConfigForm } from './WebUntisConfigForm';

interface WebUntisModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WebUntisConfig | null;
  onSyncCompleted: (message: string) => void;
  onGroupsChanged: () => void;
}

export const WebUntisModal: React.FC<WebUntisModalProps> = ({ isOpen, onClose, config, onSyncCompleted, onGroupsChanged }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="WebUntis verbinden"
    subtitle="Stundenplan, Vertretungen und Hausübungen automatisch laden"
    icon={<School className="h-[18px] w-[18px]" />}
  >
    <WebUntisConfigForm config={config} onSynced={onSyncCompleted} onGroupsChanged={onGroupsChanged} />
  </Modal>
);
