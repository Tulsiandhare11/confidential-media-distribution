import { ActivityIcon, LayoutDashboardIcon, ScanSearchIcon } from 'lucide-react';

export const navigation = [
{ to: '/', label: 'Dashboard', icon: LayoutDashboardIcon, end: true },
{ to: '/verify', label: 'Verify & Trace', icon: ScanSearchIcon, end: false },
{ to: '/activity', label: 'Activity', icon: ActivityIcon, end: false }];