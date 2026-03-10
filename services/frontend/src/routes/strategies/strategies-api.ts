import { listBacktests, listStrategies } from '@/lib/api-client';

export const fetchStrategyBacktests = () => listBacktests();
export const fetchStrategiesCatalog = () => listStrategies();