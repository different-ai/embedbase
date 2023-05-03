import supabase
import yaml
import pandas as pd
import fire
from tqdm import tqdm

def get_all_users_as_csv():
    print("Getting all users as csv...")
    # read config.yaml
    with open("config.yaml", "r") as f:
        config = yaml.safe_load(f)
        c = supabase.create_client(
            config["supabase_url"],
            config["supabase_key"],
        )
        # get all users
        users = []
        data = c.table("profiles").select("*").execute().data
        for e in tqdm(data):
            res = c.auth.admin.get_user_by_id(e["id"])
            users.append(res.user.email)
        
        # convert to csv
        print("Converting to csv...", users)
        df = pd.DataFrame(users)
        df.to_csv("users.csv", index=False)

if __name__ == "__main__":
    fire.Fire({
        "get_users": get_all_users_as_csv,
    })
