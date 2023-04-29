from typing import Iterator
from fastapi import Request
import numpy as np
import pandas as pd
from pandas import DataFrame
import sys

class BatchGenerator:
    """ Models a simple batch generator that make chunks out of an input DataFrame. """
    
    def __init__(self, batch_size: int = 10) -> None:
        self.batch_size = batch_size
    
    def to_batches(self, df: pd.DataFrame) -> Iterator[pd.DataFrame]:
        """ Makes chunks out of an input DataFrame. """
        # drop index
        df = df.reset_index(drop=True)
        splits = self.splits_num(df.shape[0])
        if splits <= 1:
            yield df
        else:
            for chunk in np.array_split(df, splits):
                yield chunk
    
    def splits_num(self, elements: int) -> int:
        """ Determines how many chunks DataFrame contians. """
        return round(elements / self.batch_size)
    
    __call__ = to_batches


def too_big_rows(df: DataFrame):
    """
    way to avoid
    Reason: Bad Request
    HTTP response headers: HTTPHeaderDict({'content-type': 'application/json', 'date': 'Wed, 04 Jan 2023 15:18:40 GMT', 'x-envoy-upstream-service-time': '1', 'content-length': '115', 'server': 'envoy'})
    HTTP response body: {"code":3,"message":"metadata size is 11759 bytes, which exceeds the limit of 10240 bytes per vector","details":[]}
    Check if data is small enough

    return size in bytes
    """
    # find too big rows in memory bytes
    too_big_rows = []
    for i, row in df.iterrows():
        size = 0
        size += sys.getsizeof(row.data)
        if size > 10240:
            too_big_rows.append(i)
            print(f"Row {i} is too big, size {size}")
    return too_big_rows

from itertools import islice

def batched(iterable, n):
    """Batch data into tuples of length n. The last batch may be shorter."""
    # batched('ABCDEFG', 3) --> ABC DEF G
    if n < 1:
        raise ValueError('n must be at least one')
    it = iter(iterable)
    while (batch := tuple(islice(it, n))):
        yield batch


def get_user_id(req: Request) -> str:
    return req.scope.get("uid")


# pylint: disable=anomalous-backslash-in-string
embedbase_ascii = """
                 _           _   _         _               _          _         
        /\ \        /\_\/\_\ _    / /\            /\ \       /\ \       
       /  \ \      / / / / //\_\ / /  \          /  \ \     /  \ \____  
      / /\ \ \    /\ \/ \ \/ / // / /\ \        / /\ \ \   / /\ \_____\ 
     / / /\ \_\  /  \____\__/ // / /\ \ \      / / /\ \_\ / / /\/___  / 
    / /_/_ \/_/ / /\/________// / /\ \_\ \    / /_/_ \/_// / /   / / /  
   / /____/\   / / /\/_// / // / /\ \ \___\  / /____/\  / / /   / / /   
  / /\____\/  / / /    / / // / /  \ \ \__/ / /\____\/ / / /   / / /    
 / / /______ / / /    / / // / /____\_\ \  / / /______ \ \ \__/ / /     
/ / /_______\\/_/    / / // / /__________\/ / /_______\ \ \___\/ /      
\/__________/ _      \/_/ \/_____________/\/__________/  \/_____/       
             / /\            / /\               / /\         /\ \       
            / /  \          / /  \             / /  \       /  \ \      
           / / /\ \        / / /\ \           / / /\ \__   / /\ \ \     
          / / /\ \ \      / / /\ \ \         / / /\ \___\ / / /\ \_\    
         / / /\ \_\ \    / / /  \ \ \        \ \ \ \/___// /_/_ \/_/    
        / / /\ \ \___\  / / /___/ /\ \        \ \ \     / /____/\       
       / / /  \ \ \__/ / / /_____/ /\ \   _    \ \ \   / /\____\/       
      / / /____\_\ \  / /_________/\ \ \ /_/\__/ / /  / / /______       
     / / /__________\/ / /_       __\ \_\\ \/___/ /  / / /_______\      
     \/_____________/\_\___\     /____/_/ \_____\/   \/__________/      
                                                                                                
                 [-0.005, 0.012, -0.008, ..., -0.010]
"""