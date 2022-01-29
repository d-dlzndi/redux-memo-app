//============================================
//                  DATA
//============================================

const lsDataName = "MemoAppData";
const dataFormat = '.memojs';
const getFileName = date => 'memo_' + date + dataFormat;

const GetLocalData = () => {
    return JSON.parse(localStorage.getItem(lsDataName));
}
const SetLocalData = (data) => {
    localStorage.setItem(lsDataName, JSON.stringify(data));
}
const ResetLocalData = () => {
    localStorage.removeItem(lsDataName);
}

function saveToFile() {
    if (!confirm("Do you want to export all the memos to a file?")){
        return;
    }

    const date = Date.now();
    const content = JSON.stringify({saveDate: date, data: GetLocalData()});
    const fileName = getFileName(date);

    let blob = new Blob([content], { type: 'text/plain' });
    let objURL = window.URL.createObjectURL(blob);
    if (window.__Xr_objURL_forCreatingFile__) {
        window.URL.revokeObjectURL(window.__Xr_objURL_forCreatingFile__);
    }
    window.__Xr_objURL_forCreatingFile__ = objURL;
    
    let a = document.createElement('a');
    a.download = fileName;
    a.href = objURL;
    a.click();
    window.URL.revokeObjectURL(objURL);
}

async function loadFile(target) {
    const file = target.files[0];
    target.value = null;
    let text = await file.text();
    text = JSON.parse(text);
    if (!text.data || !text.saveDate){
        return alert(`Data reading failed.`);
    }
    SetLocalData(text.data);
    location.reload();
    alert(`Data created ${timeForToday(text.saveDate)} has been applied.`);
}

//============================================
//              Redux Setting
//============================================

function reducer(oldState, action) {
    const nowDate = new Date();

    if (action.type === 'RESET') {
        oldState = undefined;
        ResetLocalData();
    }

    if(oldState === undefined) {
        const data = GetLocalData();
        if (!data) {
            const firstMemos = [
                {id: 0, body:'Hello!\nThis is my first memo!', date: nowDate, modifiedDate: nowDate},
            ];
            return {
                id: -1,
                mode: 'HOME',
                memos: firstMemos,
                nextId: firstMemos.length
            }
        } else {
            data.id = -1;
            data.mode = 'HOME';
            data.date = new Date(data.date);
            data.modifiedDate = new Date(data.modifiedDate);
            return data;
        }
    } 

    const newState = {...oldState};
    if (action.type === 'SET_MODE'){
        newState.mode = action.mode;

    } else if (action.type === 'SET_ID'){
        if (action.mode) newState.mode = action.mode;
        newState.id = action.id;

    } else if (action.type === 'CREATE'){
        if (action.body == ""){
            alert("There is no content written!");
            return oldState;
        }
        newState.memos.push({ 
            id: oldState.nextId, 
            body: action.body,
            date: nowDate,
            modifiedDate: nowDate
        })
        newState.nextId += 1;

    } else if (action.type === 'UPDATE'){ 
        newState.id = action.id;
        const index = newState.memos.findIndex(x => x.id === newState.id);

        if (newState.memos[index].body == action.body) {
            return oldState;
        }
        newState.memos[index].body = action.body;
        newState.memos[index].modifiedDate = nowDate;

    } else if (action.type === 'DELETE'){
        let memos = newState.memos.filter(x => x.id !== action.id);
        newState.memos = memos;
    }

    SetLocalData(newState);
    return newState;
}

const store = Redux.createStore(reducer,
            //, /* preloadedState, */
            window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__());


//============================================
//                   HTML
//============================================

function Article() {
    const state = store.getState();
    let memos = state.memos;
    let articleTag = '';
        
    for(let i= memos.length - 1; i >= 0; i--) {
        articleTag += `<div class="box" id="memo_${memos[i].id}">`;
        articleTag += getBoxContent(memos[i]);
        articleTag += '</div>';
    }
    document.getElementById('memoBox').innerHTML = `${articleTag}`;
    setOverflowBoxStyle();
    addCreateForm(state.nextId);
}
Article();
store.subscribe(Article);

function getMemo(id) {
    const state = store.getState();
    return state.memos.find(x => x.id === id);
}

function getBoxContent(memo) {
    let articleTag = '';
    articleTag += `<span class="date">${timeForToday(memo.date)}</span>`;
    if (memo.date !== memo.modifiedDate) {
        articleTag += `<span class="modifiedDate">Last Modified : ${timeForToday(memo.modifiedDate)}</span>`;
    }
    articleTag += `<div class="memo-content" id="memo_content_${memo.id}" 
                    ondblclick="addUpdateForm(this, ${memo.id})">${marked.parse(memo.body)}</div>`;
    articleTag += `<div class="memo-content-more btn" onclick="openMemoContent(this)">MORE</div>`;
    articleTag += `<button class="no-bg" onclick="deleteMemo(event, ${memo.id})">
        <span class="material-icons">delete</span></button>`;
    return articleTag;
}

function addUpdateForm(target, id) {
    const memo = getMemo(id);
    let box = target.closest('.box');
    box.innerHTML = `
    <form onsubmit="store.dispatch({ type: 'UPDATE', id: ${id}, 
        body: event.target.querySelector('.memo-textarea').innerText }); 
        goHome(event)">
        <div contentEditable="true" placeholder="MEMO HERE" class="memo-textarea" name="text" spellcheck="false">${memo.body}</div>
        <div class="btn-group">
            <button class="no-bg" onclick="setCancelUpdateBox(event, ${id})" >CANCEL</button>
            <button class="sub-bg" type="submit">UPDATE</button>
        </div>
    </form>
    `;
    box.classList.add('update');
}

function setCancelUpdateBox(event, id){
    event.preventDefault();
    let box = event.target.closest('.box');
    box.innerHTML = getBoxContent(getMemo(id));
    box.classList.remove('update');
    setOverflowBoxStyle(box.querySelector('.memo-content'));
}

function addCreateForm(nextId){
    const tag = document.createElement('div');
    tag.classList.add('box', 'point');
    tag.innerHTML = `
    <form onsubmit="
        store.dispatch({type: 'CREATE', body: event.target.querySelector('.memo-textarea').innerText });
        goHome(event);
    ">
        <div id="editor" contentEditable="true" placeholder="MEMO HERE" class="memo-textarea" name="text" spellcheck="false"></div>
        <button class="no-bg btn-wide right" type="submit"><span class="material-icons">add</span></button>
    </form>
    `;
    document.getElementById('memoBox').prepend(tag);
}



//============================================
//                   Action
//============================================

function goHome(event) {
    if (event) event.preventDefault();
    store.dispatch({type: 'SET_MODE', mode: 'HOME'});
}

function resetMemo(event) {
    if (event) event.preventDefault(); 
    if(confirm("Do you want to delete all the memos?")) {
        store.dispatch({type: 'RESET'});
    }
}

function deleteMemo(event, id) {
    if(confirm("Do you want to delete this memo?")) {
        store.dispatch({type: 'DELETE', id: id});
        goHome(event);
    }
}

function timeForToday(value) {
    const today = new Date();
    const timeValue = new Date(value);

    const betweenTime = Math.floor((today.getTime() - timeValue.getTime()) / 1000 / 60);
    if (betweenTime < 1) return 'just a moment ago';
    if (betweenTime < 60) {
        return `${betweenTime} minutes ago`;
    }

    const betweenTimeHour = Math.floor(betweenTime / 60);
    if (betweenTimeHour < 24) {
        return `${betweenTimeHour} hours ago`;
    }

    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
    if (betweenTimeDay < 365) {
        return `${betweenTimeDay} days ago`;
    }

    return `${Math.floor(betweenTimeDay / 365)} years ago`;
}

function setOverflowBoxStyle(target){
	document.querySelectorAll('.memo-content code').forEach((el)=>{
		el.classList.add('hljs');
	});
	
    if (target) {
        if (isOverflown(target))
            target.classList.add('overflow');
        else
            target.classList.remove('overflow');
        return;
    }

    let boxes = document.querySelectorAll('#memoBox .box');
    for(let i=0; i<boxes.length; i++){
        const content = boxes[i].querySelector('.memo-content');
        if (!content) continue;
        if (isOverflown(content))
            content.classList.add('overflow');
        else
            content.classList.remove('overflow');
    }
}
window.addEventListener('resize', () => { setOverflowBoxStyle() });

function isOverflown(element) {
    return element.scrollHeight > element.clientHeight;
     // || element.scrollWidth > element.clientWidth;
}

function openMemoContent(target) {
    const content = target.parentNode.querySelector('.memo-content');
    content.classList.remove('overflow');
    content.classList.add('scroll');
}
