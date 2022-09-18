#!/bin/bash

GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-""}
if [[ -z "$GITHUB_REPOSITORY" ]]; then
    exit 1
fi

headers="-H 'Accept: application/vnd.github+json'" 
cache_info=$(gh api "$headers" "/repos/${GITHUB_REPOSITORY}/actions/caches")
echo "$cache_info"
