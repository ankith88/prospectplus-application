import { AMSettingsDashboard } from '@/components/account-manager/am-settings-dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AM Settings | ProspectPlus',
  description: 'Settings dashboard for Account Managers',
};

export default function AccountManagerSettingsPage() {
  return <AMSettingsDashboard />;
}
