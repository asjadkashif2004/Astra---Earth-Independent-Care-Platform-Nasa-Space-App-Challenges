# Offline PDF extraction tool

Pinned `pypdf6.21.2` pure-Python wheel from the official [PyPI release](https://pypi.org/project/pypdf/6.21.2/),407,766bytes,SHA-256`1d44d1a3a200f25062adff0085b02040e4646431ac2ccac22e42679e91466084`. Publisher JSON/size/hash evidence is preserved in the N13 source-review directory. [BSD-3-Clause license](PYPDF_LICENSE.txt) is extracted unchanged from the wheel's license member. No pip/system install,npm dependency,optional package or network is needed to import the local wheel.

Only `scripts/extract-publication.py` imports it after verifying its hash. The isolated offline extraction process is memory/CPU/output bounded on WSL/Unix;it does not render PDFs,perform OCR,execute PDF actions or follow references. This is a build/verification tool,not a running ASTRA application dependency. Do not upgrade/repin without a separately approved task and a new reproducibility review.
