
import { User, Request, UserRole } from '@/types';
import { subDays, formatISO } from 'date-fns';

export const USERS: User[] = [
  {
    id: 'user-0',
    name: 'Super Admin',
    roles: [{ role: 'Super Admin' }],
    email: 'superadmin@niti.gov.in',
    password: 'SuperAdmin@123',
    avatarUrl: 'https://picsum.photos/seed/0/100/100',
  },
  {
    id: 'user-1',
    name: 'Aarav Sharma',
    roles: [{ role: 'CEO NITI' }],
    email: 'ceo.niti@gov.in',
    password: 'Ceo@123',
    avatarUrl: 'https://picsum.photos/seed/1/100/100',
  },
  {
    id: 'user-2',
    name: 'Priya Patel',
    roles: [
        { role: 'State Advisor', state: 'Uttar Pradesh' },
        { role: 'State Advisor', state: 'Gujarat' }
    ],
    email: 'advisor.up@gov.in',
    password: 'Advisor@123',
    avatarUrl: 'https://picsum.photos/seed/2/100/100',
  },
  {
    id: 'user-3',
    name: 'Rohan Mehta',
    roles: [{ role: 'State YP', state: 'Uttar Pradesh' }],
    email: 'yp.up@gov.in',
    password: 'YP@123',
    avatarUrl: 'https://picsum.photos/seed/3/100/100',
  },
  {
    id: 'user-4',
    name: 'Saanvi Gupta',
    roles: [
        { role: 'Division HOD', state: 'Uttar Pradesh', division: 'Education' },
        { role: 'Division HOD', state: 'Maharashtra', division: 'Health' }
    ],
    email: 'hod.up.education@gov.in',
    password: 'HOD@123',
    avatarUrl: 'https://picsum.photos/seed/4/100/100',
  },
  {
    id: 'user-5',
    name: 'Vihaan Kumar',
    roles: [{ role: 'Division YP', state: 'Maharashtra', division: 'Health' }],
    email: 'yp.div.up@gov.in',
    password: 'DivYP@123',
    avatarUrl: 'https://picsum.photos/seed/5/100/100',
  },
  {
    id: 'user-6',
    name: 'Anika Singh',
    roles: [{ role: 'PMO Viewer' }],
    email: 'pmo@gov.in',
    password: 'PMO@123',
    avatarUrl: 'https://picsum.photos/seed/6/100/100',
  },
];

export const USER_ROLES: UserRole[] = [
  'CEO NITI',
  'State Advisor',
  'State YP',
  'Division HOD',
  'Division YP',
  'PMO Viewer',
  'Super Admin'
];

// All Indian States and Union Territories
export const STATES = [
    // States
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
    // Union Territories
    'Andaman and Nicobar Islands',
    'Chandigarh',
    'Dadra and Nagar Haveli',
    'Daman and Diu',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Lakshadweep',
    'Puducherry',
];

// Common divisions (for reference/autocomplete, but users can enter any division)
export const DIVISIONS = [
    'Education',
    'Health',
    'Energy',
    'Agriculture',
    'Technology',
    'Infrastructure',
    'Finance',
    'Transport',
    'Rural Development',
    'Urban Development',
    'Water Resources',
    'Environment',
    'Tourism',
    'Industry',
    'Commerce',
    'Labour',
    'Social Welfare',
    'Women and Child Development',
    'Youth Affairs',
    'Sports',
];

// Mock requests removed - using only database requests now
// If you need mock data for development/testing, uncomment and modify the array below
export const REQUESTS: Request[] = [];
