import { useEffect, useRef, useState } from 'react'
import { useApiKeys } from '../components/APIKeys'
import { EMBEDBASE_CLOUD_URL } from '../utils/constants'
export interface Dataset {
  id: string
  documentsCount: number
}

export function useDatasets(): { datasets: Dataset[]; isLoading: boolean } {
  const { apiKeys } = useApiKeys()
  const firstApiKey = apiKeys?.length > 0 && apiKeys[0].id
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [isLoading, setLoading] = useState(false)
  useEffect(() => {
    if (!firstApiKey) return
    setLoading(true)
    fetch(EMBEDBASE_CLOUD_URL + '/v1/datasets', {
      headers: {
        Authorization: 'Bearer ' + firstApiKey,
        'Content-Type': 'application/json',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setDatasets(
          data.datasets.map((dataset: any) => ({
            id: dataset.dataset_id,
            documentsCount: dataset.documents_count,
          }))
        )
      })
      .finally(() => setLoading(false))
  }, [firstApiKey])
  return { datasets, isLoading }
}
