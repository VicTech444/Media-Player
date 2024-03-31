"use strict";
const $ = ($selector) => document.querySelector($selector);
const $all = ($allSelectors) => document.querySelectorAll($allSelectors)

const $songListContainer = $(`.list`);
const $songFileInput = $(`#song-file`);
const $playButton = $(`#play`);
const $stopButton = $(`#stop`);
const $songName = $(`#song-name`);
const $authorName = $(`#author-name`);
const $errorMessage = $(`#message`);
const $currentTime = $(`#current-time`);
const $totalDuration = $(`#total-duration`);
const $progressBar = $(`#song-progress-bar`);
const $backgroundImage = $(`#background-image`);

const $previousContainer = $(`.reverse`);
const $previousSvgHover = $(`.reverse svg`);
const $previousPathHover = $all(`.reverse path`);

const $nextContainer = $(`.next`);
const $nextSvgHover = $(`.next svg`);
const $nextPathHover = $all(`.next path`);

const allSongsInformation = new Map();
let noExtensionRegEx = /(.+)\.(.+)/;
let songInputData;
let minutes = 0;
let shazamAPIResponse;
let currentSongReproducing;

let dataBase;
let bd;
let request = indexedDB.open(`data-base`);

const createStore = (event) => {
    dataBase = event.target.result;
    dataBase.createObjectStore("song-list", { autoIncrement: true });
}

const addEvents = async () => {
    return new Promise((resolve, reject) => {
        request.addEventListener(`error`, ev => console.log(ev));
        request.addEventListener(`success`, async (ev) => {
            bd = ev.target.result;
            resolve(`Data base loaded`);
        });
        request.addEventListener(`upgradeneeded`, ev => createStore(ev));
    });
}

const addSong = (songObjectInfo) => {
    let newRequest = bd.transaction(["song-list"], "readwrite");
    let storage = newRequest.objectStore("song-list");

    storage.add(songObjectInfo);
}

const initiateDataBase = async () => {
    await addEvents();
}

const saveSongsAndEvents = async (songName, title, subtitle, backgroundImage, audioURL) => {
    const audio = new Audio(audioURL);
    audio.setAttribute(`name`, songName);

    allSongsInformation.set(songName, { songName, title, subtitle, backgroundImage, audio }); 
    await addAudioEvents(audio);
    await placeSongInfoInDiv(songName, title, subtitle, backgroundImage, audio);
}

const addAudioEvents = async (audioToAdd) => {
    audioToAdd.addEventListener(`ended`, () => {
        hiddenAttributeChanger($stopButton, $playButton, `hidden`, "", `hidden`);
        setTimeout(() => {
            playNextSong();
            hiddenAttributeChanger($playButton, $stopButton, `hidden`, "", `hidden`);
        }, 1000);
    });

    let progressBarUpdates = new Date();

    audioToAdd.addEventListener("timeupdate", (ev) => {
        if (audioToAdd.currentTime != 0) {
            if (audioToAdd.getAttribute(`name`) != $(`.visible`).textContent) {
                $currentTime.textContent = `0:00`;

            } else {
                $currentTime.textContent = convertToMinutesAndSeconds(progressBarUpdates, audioToAdd.currentTime.toFixed(0));
                $progressBar.setAttribute(`value`, audioToAdd.currentTime);
            }
        }
    });

    audioToAdd.addEventListener(`play`, () => {
        let onlyAudiosObj = allSongsInformation.values();
        let onlyAudios = [...onlyAudiosObj];

        onlyAudios.filter((element) => {
            if (element.songName != ($(`.visible`).textContent || $(`.playing`).textContent)) {
                element.audio.currentTime = 0;
            }
        })
    })
}

const placeSongInfoInDiv = async (shazamSongName, title, subtitle, backgroundImage, audio) => {
    let $divWhereSong = document.createElement(`DIV`);
    $divWhereSong.innerHTML = `<label>${shazamSongName}</label>`;

    giveDivDetails($divWhereSong, shazamSongName, title, subtitle, backgroundImage, audio);
    $songListContainer.append($divWhereSong);
}

const hiddenAttributeChanger = async (...information) => {
    let [elementToAdd, elementToRemove,
        attributeToAdd, value,
        attributeToRemove] = information;

    elementToAdd.setAttribute(attributeToAdd, value);
    elementToRemove.removeAttribute(attributeToRemove);
}

const convertToMinutesAndSeconds = (dateObject, seconds) => {
    dateObject.setMinutes(minutes, seconds);

    if (dateObject.getSeconds() == 60) {
        minutes++;

    } else if (dateObject.getSeconds().toString().length < 2) {
        return `${dateObject.getMinutes()}:0${dateObject.getSeconds()}`;

    } else if (dateObject.getSeconds().toString().length == 2) {
        return `${dateObject.getMinutes()}:${dateObject.getSeconds()}`;
    }
}

const giveDivDetails = ($divToModify, shazamSongName, title, subtitle, backgroundImage, audioInformation) => {
    $divToModify.classList.add(`song`);
    $divToModify.addEventListener(`click`, () => showActiveSong($divToModify, shazamSongName, title, subtitle, backgroundImage, audioInformation));
}

const showActiveSong = ($currentSelectDiv, shazamSongName, title, subtitle, backgroundImage, audio) => {
    if (!$(`.visible`)) {
        $currentSelectDiv.classList.add(`visible`);

    } else if ($currentSelectDiv.classList.contains(`visible`) && ($(`.visible`).textContent == $currentSelectDiv.textContent)) {
        return;

    } else {
        $(`.visible`).classList.remove(`visible`);
        $currentSelectDiv.classList.add(`visible`);
    }

    $progressBar.setAttribute(`value`, 0);

    modifyingBody(shazamSongName, title, subtitle, backgroundImage, audio);
    showStopButton();

    if ($(`.playing`)) notReproducingDuplicates();
}

const modifyingBody = async (shazamSongName, title, subtitle, backgroundImage, songInformation) => {
    let timeDuration = new Date();
    $songName.textContent = title;
    $authorName.textContent = subtitle;

    timeDuration.setMinutes(songInformation.duration / 60, (songInformation.duration % 60) + 1);

    $songName.removeAttribute(`hidden`);
    $authorName.removeAttribute(`hidden`);   
    $backgroundImage.setAttribute(`src`, backgroundImage);

    if (timeDuration.getSeconds().toString().length < 2) {
        $totalDuration.textContent = `${timeDuration.getMinutes()}:0${timeDuration.getSeconds()}`;

    } else {
        $totalDuration.textContent = `${timeDuration.getMinutes()}:${timeDuration.getSeconds()}`;
    }
    $progressBar.setAttribute(`max`, `${songInformation.duration}`);
}

const showStopButton = () => {
    songInputData ?? hiddenAttributeChanger($stopButton, $playButton, `hidden`, "", `hidden`);
}

const notReproducingDuplicates = async () => {
    if (songInputData != undefined) {
        if ($(`.visible`).textContent == $(`.playing`).textContent) {
            hiddenAttributeChanger($playButton, $stopButton, `hidden`, "", `hidden`);

        } else {
            hiddenAttributeChanger($stopButton, $playButton, `hidden`, "", `hidden`);
        }
    }
}

$songFileInput.addEventListener(`change`, (fileEvent) => {
    $errorMessage.innerHTML = `Searching information...`
    if (fileEvent.target.files[0]) {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(fileEvent.target.files[0]);

        fileReader.addEventListener(`load`, async (fileReaderEvent) => {
            const url = 'https://shazam-api6.p.rapidapi.com/shazam/recognize/';
            const data = new FormData();
            const options = {
                method: 'POST',
                headers: {
                    'X-RapidAPI-Key': '48f083acb0msh1c2a2187bae615cp1f0dfejsn25ed4d9660c7',
                    'X-RapidAPI-Host': 'shazam-api6.p.rapidapi.com'
                },
                body: data
            };

            const getShazamInfo = async () => {
                try {
                    const response = await fetch(url, options);
                    showError(`information founded...`);
                    return await response.json(); 
                } catch (error) {
                    console.log(error);
                    showError('An error has been occured, try again later...');
                }
                                 
            }

            data.append('upload_file', fileEvent.target.files[0]);
            let dataInformation = await getShazamInfo().catch((er) => console.log(`Ha ocurrido otro error`));
            let songValidation = "matches" in dataInformation;

            if(songValidation){
                let songStorageInformation;

                songStorageInformation = {
                    name: dataInformation.track.share.subject,
                    title: dataInformation.track.title,
                    subtitle: dataInformation.track.subtitle,
                    backgroundImage: dataInformation.track.images.background,
                    songURL: fileReaderEvent.target.result              
                }

                checkDuplicated2(songStorageInformation).then(async (ev) => {
                    if (ev) {
                        addSong(songStorageInformation);
                        await saveSongsAndEvents(dataInformation.track.share.subject, dataInformation.track.title,
                            dataInformation.track.subtitle, dataInformation.track.images.background,
                            fileReaderEvent.target.result);
                    }
                })
                .catch((err) => showError(err)); 

            } else {
                console.log(`An error has been occured, try again later...`);
            }  
        });
    }
})

const checkDuplicated2 = async (objectToCheck) => {
    return new Promise((resolve, reject) => {
        if (allSongsInformation.has(objectToCheck.name)) {
            reject(`The song already exist, you can't add it again`);
        } else {
            resolve(true)
        }
    });
}

const showError = (error) => {
    $errorMessage.innerHTML = error;
    setTimeout((ev) => $errorMessage.innerHTML = "", 3000);
}

const setMapInfo = async () => {
    return new Promise(async (resolve) => {
        let newRequest = bd.transaction(["song-list"], "readwrite");
        let storage = newRequest.objectStore("song-list");

        let test = await getAllInfo(storage)

        if (test.length == 0) {
            resolve();

        } else {
            test.filter(async (element, index) => {
                allSongsInformation.set(element.name, element);
                placeIndexDBInfo(allSongsInformation.get(element.name));
                if (index == [...test].length - 1) resolve();
            });
        }
    });
}
const getAllInfo = async (storage) => {
    return new Promise(async (resolve, reject) => {
        let allResults = storage.getAll();
        allResults.onsuccess = () => {
            resolve(allResults.result)
        }
    })
}

const placeIndexDBInfo = (infoToPlace) => {
    let { name, title, subtitle, backgroundImage, songURL } = infoToPlace;

    saveSongsAndEvents(name, title, subtitle, backgroundImage, songURL);
}

const playPreviousSong = () => {
    let indexPreviousSong;
    let previousSongName;

    [...allSongsInformation].filter((mainElement, mainIndex) => {
        mainElement.filter(subElement => {
            if (subElement == currentSongReproducing.getAttribute(`name`)) indexPreviousSong = mainIndex - 1;
        })
    })

    if (indexPreviousSong < 0) {
        indexPreviousSong = ([...allSongsInformation].length - 1);
        previousSongName = [...allSongsInformation][indexPreviousSong][0];

    } else {
        previousSongName = [...allSongsInformation][indexPreviousSong][0];
    }

    checkIfSongAlreadyReproduce();

    let { songName, title, subtitle, backgroundImage, songURL } = allSongsInformation.get(previousSongName);
    songInputData = allSongsInformation.get(previousSongName).audio;
    currentSongReproducing = songInputData;
    minutes = 0;

    $(`.playing`).classList.remove(`playing`);
    $(`.visible`).classList.remove(`visible`);

    let allDivInsideList = $all(`.list .song`);
    let previousDiv;

    allDivInsideList.forEach((mainElement) => {
        if (mainElement.textContent == songName) {
            previousDiv = mainElement;
            previousDiv.classList.add(`visible`, `playing`);
            hiddenAttributeChanger($playButton, $stopButton, 'hidden', "", 'hidden');
        }
    });

    modifyingBody(songName, title, subtitle, backgroundImage, songInputData)
    songInputData.play();
}

const playSong = async () => {
    checkIfSongAlreadyReproduce();

    let songStringName = $(`.visible`).textContent;
    songInputData = allSongsInformation.get(songStringName).audio;
    currentSongReproducing = songInputData;
    minutes = 0;

    songInputData.play();
}

const playNextSong = () => {
    let indexNextSong;
    let nextSongName;

    [...allSongsInformation].filter((elementMain, indexMain) => {
        elementMain.filter(subElement => {
            if (subElement == currentSongReproducing.getAttribute(`name`)) indexNextSong = indexMain + 1;
        })
    })

    if (indexNextSong >= [...allSongsInformation].length) {
        indexNextSong = 0;
        nextSongName = ([...allSongsInformation][indexNextSong][0]);

    } else {
        nextSongName = ([...allSongsInformation][indexNextSong][0]);
    }

    checkIfSongAlreadyReproduce();
    let { songName, title, subtitle, backgroundImage, songURL } = allSongsInformation.get(nextSongName);
    songInputData = allSongsInformation.get(nextSongName).audio;
    currentSongReproducing = songInputData;
    minutes = 0;

    $(`.playing`).classList.remove(`playing`);
    $(`.visible`).classList.remove(`visible`);

    let allDivInsideList = $all(`.list .song`);
    let nextDiv;

    allDivInsideList.forEach((mainElement) => {
        if (mainElement.textContent == songName) {
            nextDiv = mainElement;
            nextDiv.classList.add(`visible`, `playing`);
            hiddenAttributeChanger($playButton, $stopButton, 'hidden', "", 'hidden');
        }
    })

    modifyingBody(songName, title, subtitle, backgroundImage, songInputData)
    songInputData.play();
}


const checkIfSongAlreadyReproduce = () => {
    if (songInputData == undefined) return;
    songInputData.pause()
}

$playButton.addEventListener(`click`, async (ev) => {
    if ($(`.visible`)) {
        playSong();

        if ($(`.paused`)) {
            $(`.paused`).classList.remove(`paused`);
            $(`.visible`).classList.add(`playing`);

        } else if ($(`.playing`)) {
            $(`.playing`).classList.remove(`playing`);
            $(`.visible`).classList.add(`playing`);

        } else {
            $(`.visible`).classList.add(`playing`);
        }
        hiddenAttributeChanger($playButton, $stopButton, `hidden`, "", `hidden`);

    } else {
        showError(`You need to select a song first`);
    }
});

$stopButton.addEventListener(`click`, async (ev) => {
    songInputData.pause();
    if ($(`.visible`).textContent == $(`.playing`).textContent) {
        $(`.playing`).classList.replace(`playing`, `paused`);

    } else {
        $(`.playing`).classList.remove(`playing`);
    }

    await hiddenAttributeChanger($stopButton, $playButton, `hidden`, "", `hidden`);
})

const removeLoadScreen = async () => {
    $(`.load-screen`).style.opacity = `0`;
    $(`.load-screen`).addEventListener(`transitionend`, (ev => {
        $(`.song-list-container`).classList.remove(`hidden`);
        ev.target.remove();
    }))
}

const loadDataBase = async () => {
    return new Promise(async (resolve, reject) => {
        await initiateDataBase();
        await setMapInfo();
        setTimeout((ev) => resolve(), 1000)

    })
}

const loadProgram = async () => {
    await loadDataBase();
    await removeLoadScreen();
}

loadProgram()

$previousContainer.addEventListener(`mouseenter`, (ev) => {
    $previousSvgHover.classList.toggle(`stroke`);
    $previousPathHover.forEach((element) => element.classList.toggle(`stroke`));
});

$previousContainer.addEventListener(`mouseleave`, (ev) => {
    $previousSvgHover.classList.toggle(`stroke`);
    $previousPathHover.forEach((element) => element.classList.toggle(`stroke`));
});

$previousContainer.addEventListener(`click`, (ev) => {
    if (currentSongReproducing != undefined) {
        playPreviousSong();

    } else {
        showError(`You need to select a song first`);
    }

    $previousSvgHover.classList.toggle(`active`);
    $previousPathHover.forEach((element) => element.classList.toggle(`active`));

    setTimeout(ev => {
        $previousSvgHover.classList.toggle(`active`);
        $previousPathHover.forEach((element) => element.classList.toggle(`active`));
    }, 100)
});

$nextContainer.addEventListener(`mouseenter`, (ev) => {
    $nextSvgHover.classList.toggle(`stroke`);
    $nextPathHover.forEach((element) => element.classList.toggle(`stroke`));
});

$nextContainer.addEventListener(`mouseleave`, (ev) => {
    $nextSvgHover.classList.toggle(`stroke`);
    $nextPathHover.forEach((element) => element.classList.toggle(`stroke`));
});

$nextContainer.addEventListener(`click`, (ev) => {
    if (currentSongReproducing != undefined) {
        playNextSong();

    } else {
        showError(`You need to select a song first`);
    }

    $nextSvgHover.classList.toggle(`active`);
    $nextPathHover.forEach((element) => element.classList.toggle(`active`));

    setTimeout(ev => {
        $nextSvgHover.classList.toggle(`active`);
        $nextPathHover.forEach((element) => element.classList.toggle(`active`));
    }, 100)
});

$progressBar.addEventListener(`click`, (ev) => {
    if (songInputData != undefined && $(`.visible`).textContent == currentSongReproducing.getAttribute(`name`)) {
        const rect = $progressBar.getBoundingClientRect();
        const offsetX = ev.clientX - rect.left;
        const width = rect.width;

        const progressClickValue = (offsetX / width) * songInputData.duration;
        $progressBar.value = progressClickValue;
        songInputData.currentTime = progressClickValue;
    }
})
