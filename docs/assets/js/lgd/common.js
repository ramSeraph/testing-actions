
var bucketName = 'lgd_data_archive';
var listFileName = 'listing_archives.txt';

var monthNames = ["January", "February", "March", "April",
                  "May", "June", "July", "August", "September",
                  "October", "November", "December"];
var monthMap = {};
for (const m of monthNames) {
    monthMap[m.substring(0,3)] = m;
}

export function getObjectLink(objName) {
    return `https://storage.googleapis.com/${bucketName}/${objName}`; 
}

export function monthCompare(m1, m2) {
    return monthNames.indexOf(m1) - monthNames.indexOf(m2);
}

export function fileSize(size) {
    var i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

export function getDateParts(name) {
    var day = name.substring(0,2);
    var month = monthMap[name.substring(2,5)];
    var year = name.substring(5,9);

    return {
        'day': day,
        'month': month,
        'year': year,
        'date': new Date(`${year}-${month}-${day}`)
    };
}

function parseListing(listingText) {
    var entryTexts = listingText.split('\n');
    var sizeMap = {};
    for (var entryText of entryTexts) {
        entryText = entryText.trim();
        if (entryText === '') {
            continue;
        }
        var pieces = entryText.split(' ');
        sizeMap[pieces[1]] = pieces[0];
    }
    return sizeMap;
}


export function getArchiveList(cb) {
    console.log('getting list of all archives');
    var httpRequest = new XMLHttpRequest();
    
    const alertContents = () => {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
            if (httpRequest.status === 200) {
                var sizeMap = parseListing(httpRequest.responseText);
                cb(sizeMap, false);
            } else {
                console.log(`Remote Request failed with ${httpRequest.status} and text: ${httpRequest.responseText}`);
                cb('Remote Request failed', true);
            }
        }
    }
    
    if (!httpRequest) {
        cb('Internal Error', true);
        return;
    }
    httpRequest.onreadystatechange = alertContents;
    httpRequest.open('GET', getObjectLink(listFileName));
    httpRequest.send();
}
