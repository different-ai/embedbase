import { PrimaryButton } from "./Button";
import { CopyToClipboard } from "./CopyToClipboard";

import { useSession, useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useEffect, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useInterval } from '../hooks/useInterval'
import { useAppStore } from "../lib/store";



export const useApiKeys = () => {
  const [status, setStatus] = useState('loading');
  const [apiKeys, setApiKeys] = useState([]);
  const supabase = useSupabaseClient();
  const session = useSession();
  useInterval(() => {
    getApiKeys()
  }, 2000)

  const getApiKeys = async () => {
    try {
      const { data, status, error } = await supabase.from('api-keys').select().eq('user_id', session?.user?.id);
      if (error && status !== 406) {
        throw error
      }
      // should be removed this was just done to minimize code changees at the time
      if (data) {
        const dataWithId = data.map((item) => {
          return {
            ...item,
            id: item.api_key
          }
        })
        setApiKeys(dataWithId);
      }
    } catch (e) {
      console.error(e)
    } finally {
      setStatus('finished')
    }
  }

  return { status, apiKeys }
}


export const ApiKeyList = () => {
  const { status, apiKeys } = useApiKeys();
  const isLoading = status === "loading";

  return (
    <div className="min-h-[100px]">
      {apiKeys?.length > 0 &&
        apiKeys.map((apiKey, index) => (
          <div key={apiKey.id} className="max-w-max">
            <dl className="divide-y divide-gray-200">
              <div className="sm:grid sm:grid-cols-3 sm:gap-2 ">
                <dd className="mt-1 flex text-sm sm:col-span-2 sm:mt-0 font-medium text-gray-500 items-center">
                  <CopyToClipboard textToCopy={apiKey.id} />

                </dd>
              </div>
            </dl>
          </div>
        ))}
      {apiKeys?.length === 0 && !isLoading &&
        < div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No api keys</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new  api key.</p>
          <div className="mt-6">
            <CreateAPIKey className="max-w-max" title={<>
              <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              New API Key
            </>}
            />
          </div>
        </div>
      }
      {isLoading &&
        <div className="w-[250px] animate-pulse rounded-md bg-gray-300 text-sm">
          &nbsp;
        </div>
      }
    </div>
  );
};

interface CreateAPIKeyProps {
  title?: string | JSX.Element;
  className?: string;
  onSuccess?: () => void;
}
export const CreateAPIKey = ({ title = "Generate API Key",
  className = "", onSuccess = () => null }: CreateAPIKeyProps) => {
  const session = useSession()
  const [status, setStatus] = useState('idle');
  const supabase = useSupabaseClient();

  const handleGenerateKey = async () => {
    setStatus("loading")
    let { data, status } = await supabase.from('api-keys').insert({ user_id: session.user.id })
    setTimeout(() => {

      setStatus('success')
    }, 2000)

  };

  return (
    <PrimaryButton onClick={handleGenerateKey}
      className={className}
      disabled={status === "loading"}

    >
      {
        status === "loading" ? "Generating..." : title
      }

    </PrimaryButton>
  );
};


// didn't like the previous api so created a new component to experiment with 
export const CreateAPIKeyV2 = ({ className = "", onSuccess = () => null, children }) => {
  const user = useUser()
  const supabase = useSupabaseClient();
  const store = useAppStore(state => state)
  const [status, setStatus] = useState('idle');

  const handleGenerateKey = async () => {
    setStatus("loading")
    const u = await supabase.auth.getUser()
    let { data, status, error } = await supabase.from('api-keys').insert({ user_id: user.id }).select('*')
    console.log(data, status, error,)
    if (error) {
      console.error(error)
      return
    }
    onSuccess?.()
    store.setApiKey(data[0]?.api_key)
    setStatus('done')
  };
  const isDisabled = status === "loading" || status === "done"

  return (
    <PrimaryButton onClick={handleGenerateKey}
      className={className}
      disabled={isDisabled}
    >
      {status === "loading" && "Generating..."}
      {status === "done" && "Done"}
      {status === "idle" && children}
    </PrimaryButton>
  );
};