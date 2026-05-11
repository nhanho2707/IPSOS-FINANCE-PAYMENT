import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from "axios";
import { ApiConfig } from "../config/ApiConfig";

export const useMetadata = () => {
    const [ metadata, setMetadata ] = useState<any>(null);
    
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['metadata'],
        queryFn: async () => {
            const response = await axios.get(ApiConfig.project.getMetadata);

            return response.data.data
        },
        staleTime: Infinity,
        gcTime: Infinity
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['metadata'] });
    };

    return {
        data: query.data ?? {
            projects: [],
            project_types: [],
            departments: [],
            roles: [],
            teams: []
        },
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
        invalidate
    };
};