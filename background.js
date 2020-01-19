const PROJECT_NAME = "gerrit";
const GERRIT_URL = "https://gerrit-review.googlesource.com";

chrome.contextMenus.create({
    id: 'open',
    title: "导出分支 %s 的checklist",
    contexts: ['selection'],
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    var branchName = info.selectionText;
    console.log("rexih click context menu, got:" + branchName);
    // checkCookies();
    requestCommits(branchName);
});


// 请求gerrit rest api 拉取分支上的commit信息
function requestCommits(branchName) {
    //https://gerrit-review.googlesource.com/c/gerrit/+/251096  sasukeseiya@gmail.com  /accounts/?q=name:John+email:example.com
    //project:gerrit branch:stable-2.14 status:open    q/project:gerrit+branch:stable-2.14+status:open
    //https://gerrit-review.googlesource.com/changes/?q=project:gerrit+branch:master&o=DETAILED_ACCOUNTS&o=WEB_LINKS&o=CURRENT_COMMIT
    ///changes/?q=97&o=CURRENT_REVISION&o=CURRENT_COMMIT&o=CURRENT_FILES&o=DOWNLOAD_COMMANDS
    // xhr.open("GET", "https://gerrit-review.googlesource.com/accounts/?q=email:sasukeseiya@gmail.com", true);+status:open   &n=2 &o=NO-LIMIT
    // xhr.open("GET", "https://gerrit-review.googlesource.com/changes/?q=project:gerrit+branch:master&o=DETAILED_ACCOUNTS&n=2", true);

    var xhr = new XMLHttpRequest();
    let url = GERRIT_URL + "/changes/?q=project:" + PROJECT_NAME + "+branch:" + branchName + "&o=DETAILED_ACCOUNTS";
    xhr.open("GET", url, true);
    // xhr.withCredentials = true;
    xhr.setRequestHeader('content-type', 'application/json');
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            var checkList = parseCommits(xhr.responseText);
            var blobWorkBook = generateExcel(checkList, branchName);
            saveAs(blobWorkBook, "checklist_" + branchName + ".xlsx");
        }
    }
    xhr.send();
}

// 解析json转换成commit数据
function parseCommits(responseText) {
    if (0 == responseText.indexOf(")]}'")) {
        responseText = responseText.substring(4, responseText.length);
    }
    var resp = JSON.parse(responseText);

    var checkList = [];
    var header = new CheckItem('项目', '提交', '测试说明', '链接', '提交人')
    header.stub0 = "stub-0";
    header.stub1 = "stub-1";
    header.stub2 = "stub-2";
    header.stub3 = "stub-3";
    header.stub4 = "stub-4";
    checkList.push(header);

    for (index in resp) {
        var cur = resp[index];
        if (cur.status.toLowerCase() != "ABANDONED".toLowerCase()) {
            // CheckItem(project, subject, instruction, link, owner)
            // TODO 处理commit数据
            var item = new CheckItem(cur.project, cur.subject, cur.subject, cur._number, cur.owner.name);
            checkList.push(item);
            if (cur.status.toLowerCase() != "MERGED".toLowerCase()) {
                //TODO record not merged commits
            }
        }
    }
    return checkList;
}

// 使用commit数据生成checklist
function generateExcel(checkList, branchName) {
    var workSheet =
        XLSX.utils.json_to_sheet(checkList,
            {
                header: ["project", "stub0", "subject", "instruction", "stub1", "stub2", "stub3", "stub4", "link", "owner"],
                skipHeader: true
            })
    console.log(workSheet);
    // TODO format sheet
    return sheet2blob(workSheet, branchName);
}

// 将一个sheet转成最终的excel文件的blob对象，然后利用URL.createObjectURL下载
function sheet2blob(sheet, sheetName) {
    sheetName = sheetName || 'sheet1';
    var workbook = {
        SheetNames: [sheetName],
        Sheets: {}
    };
    workbook.Sheets[sheetName] = sheet;
    // 生成excel的配置项
    var wopts = {
        bookType: 'xlsx', // 要生成的文件类型
        bookSST: false, // 是否生成Shared String Table，官方解释是，如果开启生成速度会下降，但在低版本IOS设备上有更好的兼容性
        type: 'binary'
    };
    var wbout = XLSX.write(workbook, wopts);
    var blob = new Blob([s2ab(wbout)], {type: "application/octet-stream"});

    // 字符串转ArrayBuffer
    function s2ab(s) {
        var buf = new ArrayBuffer(s.length);
        var view = new Uint8Array(buf);
        for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
    }

    return blob;
}


function CheckItem(project, subject, instruction, link, owner) {
    this.project = project;
    this.stub0 = null;
    this.subject = subject;
    this.instruction = instruction;
    this.stub1 = null;
    this.stub2 = null;
    this.stub3 = null;
    this.stub4 = null;
    this.link = link;
    this.owner = owner;
}


function checkCookies() {
    chrome.cookies.getAll({url: "https://gerrit-review.googlesource.com"}, function (cookies) {
        for (var i in cookies) {
            var cur = cookies[i];
            if (-1 != cur.domain.indexOf("googlesource")) {
                console.log("rexih cookie>>>>" + cur);
            }
        }
    });
}

function testSaveFile() {
    var bytes = window.atob("urlData rexih"),
        n = bytes.length,
        u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bytes.charCodeAt(n);
    }
    var blob = new Blob([u8arr], {type: "application/octet-stream"});
    saveAs(blob, "fileName_test.txt");
}