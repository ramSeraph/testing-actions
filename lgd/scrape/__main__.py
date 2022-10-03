import json
import logging
from pathlib import Path

from .base import (Params, Context,
                   get_date_str,
                   setup_logging)

from .site_map import (get_sitemap, get_known_site_map,
                       get_changes_in_site_map)

logger = logging.getLogger(__name__)

if __name__ == '__main__':
    log_level = logging.DEBUG
    setup_logging(log_level)
    params = Params()
    site_map_file = Path(params.base_raw_dir).joinpath(get_date_str(), 'site_map.json')
    if not site_map_file.exists():
        ctx = Context(params)
        site_map = get_sitemap(ctx)
        site_map_file.parent.mkdir(exist_ok=True, parents=True)
        with open(site_map_file, 'w') as f:
            json.dump(site_map, f, indent=2)
    else:
        with open(site_map_file, 'r') as f:
            site_map = json.load(f)

    path = Path(params.base_raw_dir).joinpath(get_date_str(), 'struct_changes.json')
    if path.exists():
        logger.warning(f'deleting previously existing {path}')
        path.unlink()
    known_site_map = get_known_site_map()
    changes = get_changes_in_site_map(known_site_map, site_map)
    if len(changes['added']) == 0 and len(changes['removed']) == 0: 
        logger.info('No changes')
        exit(0)
    with open(path, 'w') as f:
        json.dump(changes, f, indent=2)
    exit(0)


