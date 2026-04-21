"""Monkey-patch youtube-search-python for httpx >= 0.28 compatibility.

httpx 0.28 removed the `proxies` keyword from top-level functions and
Client/AsyncClient. This patch rewrites the four request methods so
they work with the new API.
"""

import httpx
from youtubesearchpython.core.requests import RequestCore


def _get_client(self):
    if self.proxy:
        return httpx.Client(proxy=list(self.proxy.values())[0])
    return httpx.Client()


def _get_async_client(self):
    if self.proxy:
        return httpx.AsyncClient(proxy=list(self.proxy.values())[0])
    return httpx.AsyncClient()


def syncPostRequest(self) -> httpx.Response:
    with _get_client(self) as client:
        return client.post(
            self.url,
            headers={"User-Agent": "Mozilla/5.0"},
            json=self.data,
            timeout=self.timeout,
        )


async def asyncPostRequest(self) -> httpx.Response:
    async with _get_async_client(self) as client:
        return await client.post(
            self.url,
            headers={"User-Agent": "Mozilla/5.0"},
            json=self.data,
            timeout=self.timeout,
        )


def syncGetRequest(self) -> httpx.Response:
    with _get_client(self) as client:
        return client.get(
            self.url,
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=self.timeout,
            cookies={"CONSENT": "YES+1"},
        )


async def asyncGetRequest(self) -> httpx.Response:
    async with _get_async_client(self) as client:
        return await client.get(
            self.url,
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=self.timeout,
            cookies={"CONSENT": "YES+1"},
        )


RequestCore.syncPostRequest = syncPostRequest
RequestCore.asyncPostRequest = asyncPostRequest
RequestCore.syncGetRequest = syncGetRequest
RequestCore.asyncGetRequest = asyncGetRequest


# Fix: some videos return None for channel id, crashing the library
from youtubesearchpython.handlers.componenthandler import ComponentHandler

_orig_getVideoComponent = ComponentHandler._getVideoComponent

def _safe_getVideoComponent(self, element, shelfTitle=None):
    try:
        return _orig_getVideoComponent(self, element, shelfTitle)
    except TypeError:
        return None

ComponentHandler._getVideoComponent = _safe_getVideoComponent

# Also patch _getComponents to skip None results
from youtubesearchpython.core.search import SearchCore

_orig_getComponents = SearchCore._getComponents

def _safe_getComponents(self, *args, **kwargs):
    _orig_getComponents(self, *args, **kwargs)
    self.resultComponents = [c for c in self.resultComponents if c is not None]

SearchCore._getComponents = _safe_getComponents
