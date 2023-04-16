#!/bin/bash

# workaround for eleventy bug which starts scanning outside parent directory and encounters permission problems and crashes 
while true; do
    export BASE_FOLDER="/testing-actions"
    npx @11ty/eleventy --serve --incremental --pathprefix=${BASE_FOLDER}/
    exit_code=$?
    if [[ $exit_code == 0 ]]; then
        exit 0
    fi
done
