const fs = require('fs');
const ytdl = require('ytdl-core');
const Alexa = require('alexa-sdk');
var jsonQuery = require('json-query')
var search = require('youtube-search');
var request = require('request');
var ssmlCorrect = require('ssml-validator')


const makePlainText = Alexa.utils.TextUtils.makePlainText;
const makeRichText = Alexa.utils.TextUtils.makeRichText;
const makeImage = Alexa.utils.ImageUtils.makeImage;



var url = process.env['YOUTUBE_URL'];
var OFFSET = process.env['OFFSET'];
var API_KEY = process.env['API_KEY'];

var ytdlAudioOptions = { filter: (format) => format.container === 'm4a' }
var ytdlVideoOptions = { filter: (format) => format.container === 'mp4' }

var opts = {
  maxResults: 25,
    type: 'video',
    key: API_KEY
};

var checkURL = 'http://www.youtube.com/get_video_info?&video_id='


var videoPlaylist = []
var channelPlaylist = []
var currentItem = 0
var currentOffset = 0
var currentMode = 'none'




var handlers = {
    
    'PlaybackStarted' : function() {
        
    	console.log('Alexa begins playing the audio stream');
        console.log('Current playback position is ' + this.event.request.offsetInMilliseconds + 'milliseconds')
    },
    'PlaybackFinished' : function() {
    	console.log('The stream comes to an end');
    },
    
    'PlaybackStopped' : function() {
    	console.log('Alexa stops playing the audio stream');
        
        console.log('Current playback position is ' + this.event.request.offsetInMilliseconds + 'milliseconds')
        currentOffset = parseInt(this.event.request.offsetInMilliseconds)
    },
    'PlaybackPaused' : function() {
    	console.log('Alexa paused the audio stream');
        
        console.log('Current playback position is ' + this.event.request.offsetInMilliseconds + 'milliseconds')
        currentOffset = parseInt(this.event.request.offsetInMilliseconds)
    },
    
    'PlaybackNearlyFinished' : function() {
    	console.log('The currently playing stream is nearly complate and the device is ready to receive a new stream');
        
        var previousItem = currentItem
        
        if (previousItem == videoPlaylist.length -1) {
            console.log('End of playlist reached')
        } else {
            
            currentItem++
            currentOffset = 0
            playVideoURL(this, videoPlaylist[currentItem].link, currentItem, previousItem, currentOffset, 'ENQUEUE') 
        }  
    },
    
    'AMAZON.NextIntent' : function() {
    	console.log('next audio track requested');
        
        var previousItem = currentItem
        
        if (previousItem == videoPlaylist.length -1) {
            console.log('End of playlist reached')
            this.response.speak('End of playlist reached')
            this.emit(':responseReady');
        } else {
            currentItem++
            currentOffset = 0
            playVideoURL(this, videoPlaylist[currentItem].link, currentItem, null, currentOffset, 'REPLACE_ALL') 
        }  
    },
    
    'AMAZON.PreviousIntent' : function() {
    	console.log('previous audio track requested');
        
        var previousItem = currentItem
        
        if (previousItem == 0) {
            console.log('Already at beginning of playlist')
            this.response.speak('Already at beginning of playlist')
            this.emit(':responseReady');
        } else {
            currentItem--
            currentOffset = 0
            playVideoURL(this, videoPlaylist[currentItem].link, currentItem, null, currentOffset, 'REPLACE_ALL') 
        }  
    },
    
    'NowPlayingIntent' : function() {
    	console.log('Now playing requested');
        
        if (currentMode == 'video'){
            
            var title = videoPlaylist[currentItem].title
        
            var speechOutput = 'Playing ' + JSON.stringify(title);
                            speechOutput = ssmlCorrect.correct(speechOutput)

            this.response.speak(speechOutput)
            this.emit(':responseReady');
            
        } else {
            
            this.response.speak('There is currently nothing playing')
            this.emit(':responseReady');
        }

    },
    
    'PlaybackFailed' : function() {
    	console.log('Alexa encounters an error when attempting to play a stream');
        
        var previousItem = currentItem
        
        if (previousItem == videoPlaylist.length -1) {
            console.log('End of playlist reached')

        } else {
            currentItem++
            currentOffset = 0
            playVideoURL(this, videoPlaylist[currentItem].link, currentItem, null, currentOffset, 'REPLACE_ALL') 
        } 
        
    },
    
   
    
    'SessionEndedRequest': function () {
    console.log('session ended!');
    
    },
    
    'LaunchRequest': function (command)  {
         this.emit(':ask', 'Welcome to Youtube. What are you looking for?', 'I am sorry I did not catch that');
        
        

      },
     
    //Video search Intent
    'SearchIntent': function () {
    console.log('Running Search Intent')
        var options = {
          maxResults: 50,
            type: 'video',
            key: API_KEY
        };
        var alexaUtteranceText = this.event.request.intent.slots.searchID.value;
        currentMode = 'video'
        processSearch(this, alexaUtteranceText, options, 'video')

    },
    
    
    'ChannelIntent': function () {
        console.log('Running Channel Intent')
        var options = {
          maxResults: 50,
            type: 'channel',
            key: API_KEY,
            
        };
        var alexaUtteranceText = this.event.request.intent.slots.channelID.value;
        currentMode = 'channel'
        processSearch(this, alexaUtteranceText, options, 'channel')

    },
    
    'PlaylistIntent': function () {
        console.log('Running Playlist Intent')
        var options = {
          maxResults: 50,
            type: 'playlist',
            key: API_KEY,
            
        };
        var alexaUtteranceText = this.event.request.intent.slots.playlistID.value;
        currentMode = 'playlist'
        processSearch(this, alexaUtteranceText, options, 'playlist')

    },

    'NumberIntent': function () {
        
        var selectedToken = this.event.request.intent.slots.number.value;
        console.log ('Selected item is: ', selectedToken)
        if (currentMode == 'video') {
            
            if (selectedToken > videoPlaylist.length || selectedToken < 1){
                
                this.response.speak('That selection is not valid')
                this.emit(':responseReady');  
            } else {
                
                currentItem = parseInt(selectedToken) - 1
                currentOffset = 0
                playVideoURL(this, videoPlaylist[currentItem].link, currentItem, null, currentOffset, 'REPLACE_ALL')  
            }
            
            
        } else if (currentMode == 'channel'){
            
            if (selectedToken > channelPlaylist.length || selectedToken < 1){
                
                this.response.speak('That selection is not valid')
                this.emit(':responseReady');  
            } else {
                
                console.log('channel selected')
                var options = {
                  maxResults: 50,
                    type: 'video',
                    key: API_KEY,
                    channelId: channelPlaylist[token[1] -1 ].id,
                    order: 'date'
                };
                processSearch(this, '', options, 'video')
            }          
            
        } else if (currentMode == 'playlist'){
            
            if (selectedToken > channelPlaylist.length || selectedToken < 1){
                
                this.response.speak('That selection is not valid')
                this.emit(':responseReady');  
            } else {
                
                console.log('playlist selected')
                var options = {
                  maxResults: 50,
                    type: 'video',
                    key: API_KEY,
                    channelId: channelPlaylist[token[1] -1 ].id,
                    order: 'date'
                };
                processSearch(this, '', options, 'video')
            }          
            
        } 
        
        
        
        
        else {
            
            this.response.speak('No playlist could be found')
                this.emit(':responseReady'); 
        }
    
    },
    
    'ElementSelected': function () {
        var selectedToken = this.event.request.token
        console.log ('Selected token is: ', selectedToken)
        
        var token = selectedToken.split('.')
        if (token[0] == 'video') {
            console.log('Video selected')
            currentItem = parseInt(token[1])
            currentOffset = 0
            playVideoURL(this, videoPlaylist[currentItem].link, currentItem, null, currentOffset, 'REPLACE_ALL')
        } else if (token[0] == 'channel') {
            console.log('channel selected')
            var options = {
              maxResults: 50,
                type: 'video',
                key: API_KEY,
                channelId: channelPlaylist[token[1]].id,
                order: 'date'
            };
            processSearch(this, '', options, 'video')
            
        }
            
    },
    
    'AMAZON.StopIntent': function () {
        console.log('Stop intent recieved');
        this.response.speak('').audioPlayerStop();
        this.emit(':responseReady');   
    },
    
    'AMAZON.PauseIntent': function () {
        console.log('Pause intent recieved');
        
        this.response.speak('').audioPlayerStop();
        this.emit(':responseReady');   
    },
    
    'AMAZON.ResumeIntent': function () {
        console.log('Resume intent recieved');
        console.log('Currentoffset: ', currentOffset)
        playVideoURL(this, videoPlaylist[currentItem].link, currentItem, null, currentOffset, 'REPLACE_ALL')    
    },
    
    
    

    'Unhandled': function() {
        
        console.log ('something went wrong')
        console.log(this.event.request.type)
        
        if (this.event.request.type == 'IntentRequest'){
            
            this.emit(':tell','This command is not supported');
        }
        console.log(this.event.request.error)
        if (this.event.request.error.message == 'SpeechletResponse was null'){
            console.log('This is an error we can ignore')
        }
    }

}

function processSearch (handler, alexaUtteranceText, options, type){
    
    
        console.log ('Search term is : - '+ alexaUtteranceText);
            
        if (!alexaUtteranceText){
            alexaUtteranceText=''
        }
        search(alexaUtteranceText, options, function(err, results) {
          if(err) {
              console.log(err)
              handler.response.speak('I got an error from the Youtube API. Check the API Key has been copied into the Lambda environment variable properly, with no extra spaces before or after the Key')
              handler.emit(':responseReady');
          } else {
              console.log(JSON.stringify(results))
              if (type == 'video'){
                  checkResults(results, function (cleanPlaylist){
                      console.log(cleanPlaylist)
                      if (cleanPlaylist){
                          videoPlaylist = cleanPlaylist
                          currentItem = 0
                          currentOffset = 0
                          
                          if (handler.event.context.System.device.supportedInterfaces.Display){
                              console.log('Display device detected')
                              var list = buildPlaylistTemplate(cleanPlaylist, type)
                              handler.response.renderTemplate(list);
                              handler.emit(':responseReady');
                              
                          } else {      
                              console.log('Non-Display device detected')
                              var cardContent = buildCard(cleanPlaylist, 0)
                              console.log(cardContent)
                              var cardImage = cleanPlaylist[0].thumbnail
                              handler.response.cardRenderer('Unofficial Youtube', cardContent, cardImage)
                              playVideoURL(handler, cleanPlaylist[0].link, currentItem, null, currentOffset, 'REPLACE_ALL')
                          }
                      }
                  })
              } else if (type == 'channel'){
                  
                  channelPlaylist = results
                  var list = buildPlaylistTemplate(results, type)
                          handler.response.renderTemplate(list);
                          handler.emit(':responseReady');
              } 
          } 
        })

}


function checkYoutubeLink(results, count, callback){
    
    var link = checkURL + results[count].id
     request(link, function (error, response, body) {
         console.log('Checking ', link)
         if (error) {
             callback (error, null)
         } else if (response){
             //console.log(response)
             console.log(body)
             if (body.includes('status=fail') == true){
                 // we have tried to load an IP restricted video that we won't be able to play
                 results[count].video_ok = false
                 console.log('Restricted video!')
                 callback ('status=fail', null)
                 
                 } else {
                     console.log('Clear video')
                     results[count].video_ok = true
                     callback (null, true)
                 }
         }

    });
     
 }

function checkResults (results, callback){
    var playlist = []
    var counter = 0
    
    function cleanupPlaylist (newResults){
        
        console.log ('Cleaning up playlist: ' + JSON.stringify(newResults))
        for (var counted = 0; counted <= newResults.length - 1; counted++) {
            if (newResults[counted].video_ok === true) {
                var object = {
                  "title": newResults[counted].title,
                  "link": newResults[counted].link,
                  "video_id": newResults[counted].id,
                  "description": newResults[counted].description,
                  "thumbnail": newResults[counted].thumbnails.high.url

              }
                playlist.push(object)
            }
        }
        
        callback(playlist)  
        
    }
    for (var count = 0; count <= results.length - 1; count++) {          
      //check whether video is IP restricted - if it is then ignore it
      var id = checkYoutubeLink(results, count, function(err, result)  {
          
          if (err || result ){
              if (counter == results.length -1){    
                  cleanupPlaylist(results)
                } else {
                    counter++
                }
          }
      })
  }

}

function buildPlaylistTemplate(playlist, type){
    
    const listItemBuilder = new Alexa.templateBuilders.ListItemBuilder();
    const listTemplateBuilder = new Alexa.templateBuilders.ListTemplate2Builder();
    
    
    for (var count = 0; count <= playlist.length - 1; count++) {
        var title = ''
        var itemImage
        if (type == 'video'){
             itemImage = makeImage(playlist[count].thumbnail, 480, 360);
        } else if (type == 'channel'){
            itemImage = makeImage(playlist[count].thumbnails.high.url, 480, 360);
        }
        title = playlist[count].title + ' - ' + playlist[count].description
        listItemBuilder.addItem(itemImage, type + '.' + count, makePlainText(title));       
    }
    const listItems = listItemBuilder.build();
    const listTemplate = listTemplateBuilder.setToken('listToken')
    										.setTitle('Youtube Results')
    										.setListItems(listItems)
    										.build();
    console.log(listTemplate)
    return(listTemplate) 
}

function buildCard(playlist, item){
    
    var title = 'Currently Playing:- TRACK ' + (currentItem + 1) + ' : ' + playlist[item].title
    var cardPlaylist = ''
    
    for (var count = 0; count <= playlist.length - 1; count++) {
        
        var trackTitle = playlist[count].title
        cardPlaylist = cardPlaylist + (count + 1) + '. - ' + trackTitle + '\n'
    }
    return (title + '\n' + cardPlaylist)
 
}

function playVideoURL (handler, videoURL, token, previousToken, offset, behavior){
    
    console.log('Video URL to be played is', videoURL)
    ytdl.getInfo(videoURL, function (err, info){
          if (err) {
            console.log('Error recieved: ' + err.message); 
              if (err.message == 'Could not extract signature deciphering actions'){
                  
                  handler.response.speak('I am really sorry, but Youtube appear to have changed their signature key so this skill will no longer be able to play videos. This does happen from time to time so please see the github page to see if there has been an update to fix this')
                  handler.emit(':responseReady');
              } else {
                  handler.response.speak('There was an error. ' + JSON.stringify(err.message))
                  handler.emit(':responseReady');
              }
              
          } else {
                ytdl.getInfo(videoURL, function (err, info){
                      if (err) {
                        console.log(err.message); 
                      }

                // Check if we are running on a Dot/Show or FireTV
                if (handler.event.context.System.device.supportedInterfaces.Display || handler.event.context.System.device.supportedInterfaces.VideoApp ) {
                    console.log('Playing on a video enabled device')
                    var speechOutput = 'Playing ' + JSON.stringify(info.title);
                        speechOutput = ssmlCorrect.correct(speechOutput)
                      var format = ytdl.chooseFormat(info.formats, ytdlVideoOptions);
                      if (format instanceof Error) {
                        console.log(format.message);
                      }
                    var subtitle = ''

                    if (info.description.length >= 200) {
                        subtitle = info.description.substring(0,199) + '...'
                        } else {
                            subtitle = info.description
                        }
                      console.log(format.url);
                        const metadata = {
                            'title': info.title,
                            'subtitle': subtitle
                        };
                    //    handler.response.speak(speechOutput)
                     //       .playVideo(format.url, metadata);

                    handler.response.playVideo(format.url, metadata);
                        handler.emit(':responseReady');


                    } else {
                        
                        console.log ('Playing on an audio only device')

                        var format = ytdl.chooseFormat(info.formats, ytdlVideoOptions);
                      if (format instanceof Error) {
                        console.log(format.message);
                        return;
                      }
                      console.log(format.url);

                        
                        var speechOutput = 'Playing ' + JSON.stringify(info.title);
                        speechOutput = ssmlCorrect.correct(speechOutput)
                        if (behavior == 'REPLACE_ALL'){
                            handler.response.speak(speechOutput)
                        }
                        
                        handler.response.audioPlayerPlay(behavior, format.url, token, previousToken, offset);
                            handler.emit(':responseReady');
                    }

                })
        }
            
        });

}

exports.handler = function(event, context, callback){
    console.log('Event is ' + JSON.stringify(event))
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    // Create DynamoDB Table
    //alexa.dynamoDBTableName = 'youtubeSkillSettings';
    alexa.execute();
};