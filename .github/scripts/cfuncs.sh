#!/bin/bash

GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-""}
if [[ -z "$GITHUB_REPOSITORY" ]]; then
    exit 1
fi

gh_headers="Accept: application/vnd.github+json" 
curr_time=$(date +%s)

err_file=${CACHE_ERR_FILE:-"cache_err_file.txt"} 
touch $err_file

function record_call {
    echo ${FUNCNAME[*]} "$@" >> $err_file
}


function get_cache_info {
    record_call
    gh api -H "$gh_headers" "/repos/${GITHUB_REPOSITORY}/actions/caches" 2>>$err_file
}

function get_old_ids {
    record_call "$@"
    match="$1"
    if [[ -z "$1" ]]; then
        echo "match param missing" >>$err_file
        exit 1
    fi
    older_than_in_days="$2"
    if [[ ! "$older_than_in_days" =~ ^[0-9]+$ ]]; then
        echo "older_than_in_days param $older_than_in_days is not a positive number" >>$err_file
        exit 1
    fi
    cutoff=$(( curr_time - 86400 * older_than_in_days ))

    ids="$(get_cache_info | jq --arg c "$cutoff" --arg f "$match" '.actions_caches[] | select(.last_accessed_at | sub("\\.[0-9]+Z$";"Z") | fromdateiso8601 < ($c | tonumber)) | select(.key | test($f)) | .id' 2>>$err_file)"
    echo $ids
}

function delete_cache_by_ids {
    record_call "$@"
    echo "deleting ids $@"
}
