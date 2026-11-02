import axios from "axios";
import { useEffect, useState } from "react";
import { ApiConfig } from "../config/ApiConfig";

interface gotitAccountData {
    deposited: number,
    spent: number,
    balance: number
}

export function useGotItAccount(accountType: string){
    const [ loading, setLoading ] = useState(false);
    const [ error, setError ] = useState(false);
    const [ message, setMessage ] = useState("");

    const [ gotitAccount, setGotItAccount ] = useState<gotitAccountData>({
        deposited: 0,
        spent: 0,
        balance: 0
    });

    const getAccount = async () => {
        try{
            if(!accountType) return;

            setError(false);
            setLoading(true);

            const token = localStorage.getItem('authToken');

            const res = await axios.get(ApiConfig.gotit.viewGotItAccount.replace("{accountType}", accountType), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
            });

            setGotItAccount(res.data);
        }catch(error){
            setError(true);
        } finally{
            setLoading(false);
        }
    }
    
    // Resolves to false when the deposit was not saved, so the form can stay open and say so.
    const addDeposit = async (amount: string): Promise<boolean> => {
        try{
            setError(false);
            setLoading(true);

            const token = localStorage.getItem('authToken');

            const res = await axios.post(ApiConfig.gotit.depositedAccount, {
                'account_type': 'gotit',
                'amount': amount
            },{
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setGotItAccount(res.data);
            return true;
        } catch(error){
            setError(true);
            return false;
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        getAccount();
    }, [accountType]);

    return {
        loading,
        gotitAccount,
        addDeposit,
        getAccount
    }
}