import keyword
import json

print(json.dumps(keyword.kwlist, indent=2, sort_keys=True))
