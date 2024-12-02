const vscode = require("vscode");
const dayjs = require("dayjs");
const { execSync } = require("child_process");

function getGitLogJson(begTime, endTime, currentFolder) {
  try {
    let author = execSync("git config user.name").toString().trim();
    // 为了避免提交记录中出现json关键符号
    const gitCommand = `git log --since=${begTime} --until=${endTime} --author=${author} --no-merges --pretty=format:'<git-commit>author->%an|date->%ad|message->%s</git-commit>\n' --date=format:'%Y-%m-%d %H:%M:%S %A'`;
    let jsonStr = execSync(gitCommand, { cwd: currentFolder }).toString();
    if (!jsonStr) {
      throw new Error("没有找到提交记录");
    }
    // 正则
    const regex1 = /<git-commit>(.*?)<\/git-commit>\n/g;
    const _arr = jsonStr.match(regex1);
    if (!_arr) {
      throw new Error("没有找到提交记录");
    }
    if (_arr.length === 0) {
      throw new Error("没有找到提交记录");
    }
    const ls = [];
    for (const _str of _arr) {
      const regex2 =
        /author->([\w]+)\|date->([0-9\-: a-zA-z]+)\|message->([\s\S]+)<\/git-commit>/g;
      const _arr2 = regex2.exec(_str);
      ls.push({
        author: _arr2[1],
        date: _arr2[2],
        message: _arr2[3],
      });
    }
    return ls;
  } catch (error) {
    vscode.window.showErrorMessage(`执行 git 命令失败: ${error.message}`);
    return null;
  }
}

function convertWeek(week) {
  switch (week) {
    case "Monday":
      return "星期一";
    case "Tuesday":
      return "星期二";
    case "Wednesday":
      return "星期三";
    case "Thursday":
      return "星期四";
    case "Friday":
      return "星期五";
    case "Saturday":
      return "星期六";
    case "Sunday":
      return "星期日";
  }
}

function fmtMsg(msg) {
  if (!msg) {
    return "";
  }
  msg = msg.replace(/\n/g, "；");
  msg = msg.replace(/\s/g, "；");
  // 去掉开头的空格
  msg = msg.trim();
  // 使用“；”分割文本
  const arr = msg.split("；");
  let backStr = "";
  for (let item of arr) {
    if (item) {
      item = item.trim();
      item = item.replace(/([0-9])、/g, "- [$1] ");
      backStr += `${item}\n`;
    }
  }
  return backStr;
}

function activate(context) {
  // 注册 WorkDiary 命令
  const disposable = vscode.commands.registerCommand(
    "work-diary.GetWorkDiary",
    async function () {
      // 提示输入开始时间
      let begTime = await vscode.window.showInputBox({
        prompt: "开始时间 (格式: YYYY-MM-DD 不输入默认为7天前）",
      });
      if (!begTime) {
        begTime = dayjs().subtract(7, "day").format("YYYY-MM-DD");
      }

      // 提示输入结束时间
      let endTime = await vscode.window.showInputBox({
        prompt: "结束时间 (格式: YYYY-MM-DD 不输入默认为今天）",
      });
      if (!endTime) {
        endTime = dayjs().format("YYYY-MM-DD");
      }

      // 获取当前项目的根目录
      const currentFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
      let _ls = getGitLogJson(begTime, endTime, currentFolder);
      for (const el of _ls) {
        el.times = new Date(el.date).getTime();
      }
      _ls.sort((a, b) => b.times - a.times);
      for (const el of _ls) {
        el.Time = el.date.substring(11, 18);
        el.Week = el.date.substring(20);
        el.Date = el.date.substring(0, 10);
        // week 转为中文
        el.Week = convertWeek(el.Week);
      }
      let cont = "";
      const dateMap = new Map();
      for (const el of _ls) {
        el.message = fmtMsg(el.message);
        if (!dateMap.has(el.Date)) {
          dateMap.set(el.Date, true);
          cont += `### ${el.Date} ${el.Week}\n***${el.Time}***\n${el.message}\n`;
        } else {
          cont += `\n***${el.Time}***\n${el.message}\n`;
        }
      }

      const fileName = `工作日志 ${begTime}到${endTime}.md`;
      const filePath = `${currentFolder}/${fileName}`;
      // 下载到本地
      require("fs").writeFileSync(filePath, cont);
      // 打开文件
      vscode.workspace.openTextDocument(filePath).then((doc) => {
        vscode.window.showTextDocument(doc);
      });
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
