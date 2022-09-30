import logging
from pathlib import Path
from bs4 import BeautifulSoup
import requests
from datetime import datetime
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

logger = logging.getLogger(__name__)
BASE_URL = 'https://lgdirectory.gov.in'

class Params:
    def __init__(self):
        self.print_captchas = False
        self.save_failed_html = False
        self.save_all_captchas = False
        self.save_failed_captchas = False
        self.captcha_model_dir = str(Path(__file__).parent.joinpath('captcha', 'models'))
        self.archive_data = False
        self.base_raw_dir = 'data/raw'
        self.temp_dir = 'data/temp'
        self.save_intermediates = False
        self.no_verify_ssl = False
        self.connect_timeout = 10
        self.read_timeout = 60
        self.http_retries = 3

    def request_args(self):
        return {
            'verify': not self.no_verify_ssl,
            'timeout': (self.connect_timeout, self.read_timeout)
        }

    def from_dict(dikt):
        params = Params()
        params.__dict__.update(dikt)
        return params



class Context:
    def __init__(self, params=Params()):
        self.params = params
        self.last_captcha = None
        self._csrf_token = None
        self.script_session_id = ''
        self.script_batch_id = 0
        self._session = None

    def set_csrf_token(self):
        global BASE_URL
        logger.info('retrieving csrf token')
        web_data = self.session.get(BASE_URL, **self.params.request_args())
        if not web_data.ok:
            raise ValueError('bad web request.. {}: {}'.format(web_data.status_code, web_data.text))
        
        page_html = web_data.text
        
        soup = BeautifulSoup(page_html, 'html.parser')
        lgd_features_section = soup.find('section', { "id" : "lgdfeatures" })
        link_fragments = lgd_features_section.find_all('a')
        link_url = None
        for link_fragment in link_fragments:
            if link_fragment.text.strip() == 'Download Directory':
                link_url = link_fragment.attrs['href']
        if link_url is None:
            raise Exception('Download directory link not found')

        self._csrf_token = link_url.split('?')[1].replace('OWASP_CSRFTOKEN=', '')

    def set_session(self):
        s = requests.session()
        retries = self.params.http_retries
        retry = Retry(
            total=retries,
            read=retries,
            connect=retries
        )
        s.mount('http://', HTTPAdapter(max_retries=retry))
        s.mount('https://', HTTPAdapter(max_retries=retry))
        self._session = s


def setup_logging(log_level):
    from colorlog import ColoredFormatter
    formatter = ColoredFormatter("%(log_color)s%(asctime)s [%(levelname)-5s][%(process)d][%(threadName)s] %(message)s",
                                 datefmt='%Y-%m-%d %H:%M:%S',
	                             reset=True,
	                             log_colors={
	                             	'DEBUG':    'cyan',
	                             	'INFO':     'green',
	                             	'WARNING':  'yellow',
	                             	'ERROR':    'red',
	                             	'CRITICAL': 'red',
	                             },
	                             secondary_log_colors={},
	                             style='%')
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    logging.basicConfig(level=log_level, handlers=[handler])

def get_date_str(date=None):
    if date is None:
        date = datetime.today()
    date_str = date.strftime("%d%b%Y")
    return date_str



