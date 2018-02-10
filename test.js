const fs = require('fs');
const ytdl = require('ytdl-core');
var jsonQuery = require('json-query')
var search = require('youtube-search');

var opts = {
  maxResults: 25,
    type: 'channel',
    key: 'AIzaSyDxlvXwCct6obn0l1iyVYGY4gUlv6WDlkw'
};

text ='Fully Charged'

search(text, opts, function(err, results) {
          if(err) {
              console.log(err)
              
          } else {
              console.log(results)
               
          }
            
        })

