# aiomsa

aiomsa is a library for creating microservices in Python that connect to other microservices.


## Building from source

It is recommended you first create a [virtual environment](https://docs.python.org/3/library/venv.html) or [conda](https://docs.conda.io/en/latest/miniconda.html) environment before developing with aiomsa. (Python 3.8 or later is required)

```bash
# Get the code
git clone https://github.com/facebookexternal/aiomsa.git

# Install the library and its dependencies
cd aiomsa

# Option 1: If you just want to use the library locally, install it by copying the files to your Python packages directory
python -m pip install .

# Option 2: If you want to develop on aiomsa, install it by symlinking the files in this folder to your Python packages directory instead of copying
python -m pip install -e .

# Test that the installation was successful
python -c 'import aiomsa'
```

### Uninstallation

```bash
python -m pip uninstall aiomsa
```

## Usage

```python
import json
from typing import Any, Dict

from aiomsa import init
from aiomsa.clients import KafkaConsumer


async def async_main(config: Dict[str, Any]):
   """Create a KafkaConsumer instance and print the topic records to the console."""
   consumer = KafkaConsumer().consumer
   consumer.subscribe(config["topics"])

   async for msg in consumer:
      print(
         f"{msg.topic}:{msg.partition:d}:{msg.offset:d}: "
         f"key={msg.key} value={msg.value} timestamp_ms={msg.timestamp}"
      )

if __name__ == "__main__":
   with open("./service_config.json") as f:
      config = json.load(f)

   init(lambda: async_main(config), {KafkaConsumer})
```

See the docs [here]() for examples and the API reference.
