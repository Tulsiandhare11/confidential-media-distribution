export const expiryOptions = [
{ hours: 1, label: '1 hour' },
{ hours: 24, label: '24 hours' },
{ hours: 72, label: '3 days' },
{ hours: 168, label: '7 days' },
{ hours: 720, label: '30 days' }];


export const viewLimitOptions: {value: number | null;label: string;}[] = [
{ value: null, label: 'Unlimited' },
{ value: 1, label: '1 view' },
{ value: 3, label: '3 views' },
{ value: 5, label: '5 views' },
{ value: 10, label: '10 views' }];