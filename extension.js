const vscode = require("vscode");
const { exec } = require("child_process");
const dayjs = require("dayjs");
const { execSync } = require("child_process");

function GetGitLogJson(begTime, endTime, currentFolder) {
  try {
    let author = execSync("git config user.name").toString().trim();
    const gitCommand = `git log --since=${begTime} --until=${endTime} --author=${author} --no-merges --pretty=format:'{"author": "%an","date": "%ad", "message": "%s"}' --date=format:'%Y-%m-%d %H:%M:%S %A'`;
    const stdout = execSync(gitCommand, { cwd: currentFolder }).toString();
    return stdout;
  } catch (error) {
    vscode.window.showErrorMessage(`执行 git 命令失败: ${error.message}`);
    return null;
  }
}

function activate(context) {
  // 注册 WorkDiary 命令
  const disposable = vscode.commands.registerCommand(
    "work-diary.GetWorkDiary",
    async function () {
      // 提示输入开始时间
      let begTime = await vscode.window.showInputBox({
        prompt: "开始时间 (格式: YYYY-MM-DD 不输入默认为7天前) 默认",
      });
      if (!begTime) {
        begTime = dayjs().subtract(7, "day").format("YYYY-MM-DD");
      }

      // 提示输入结束时间
      let endTime = await vscode.window.showInputBox({
        prompt: "结束时间 (格式: YYYY-MM-DD 不输入默认为今天)",
      });
      if (!endTime) {
        endTime = dayjs().format("YYYY-MM-DD");
      }

      // 获取当前项目的根目录
      const currentFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
      let jsonStr = GetGitLogJson(begTime, endTime, currentFolder);
      // 使用正则把"}\n{"替换为"},{"
      jsonStr = jsonStr.replace(/}\n{/g, "},{");
      jsonStr = "[" + jsonStr + "]";
      const _ls = JSON.parse(jsonStr);
      for (const el of _ls) {
        el.Times = new Date(el.date).getTime();
      }
      _ls.sort((a, b) => b.Times - a.Times);
      for (const el of _ls) {
        el.Time = el.date.substring(11, 18);
        el.Week = el.date.substring(20);
        el.Date = el.date.substring(0, 10);
        // week 转为中文
        switch (el.Week) {
          case "Monday":
            el.Week = "星期一";
            break;
          case "Tuesday":
            el.Week = "星期二";
            break;
          case "Wednesday":
            el.Week = "星期三";
            break;
          case "Thursday":
            el.Week = "星期四";
            break;
          case "Friday":
            el.Week = "星期五";
            break;
          case "Saturday":
            el.Week = "星期六";
            break;
          case "Sunday":
            el.Week = "星期日";
            break;
        }
      }
      let cont = "";
      const dateMap = new Map();
      for (const el of _ls) {
        if (!dateMap.has(el.Date)) {
          dateMap.set(el.Date, true);
          cont += `### ${el.Week} ${el.Date}\n_${el.Time}_\n${el.message}\n`;
        } else {
          cont += `_${el.Time}_\n${el.message}\n`;
        }
      }

      const fileName = `工作日志 ${begTime}到${endTime}.md`;
      const filePath = `${currentFolder}/${fileName}`;
      // 下载到本地
      require("fs").writeFileSync(filePath, cont);
      vscode.window.showInformationMessage(`生成工作日志成功: ${filePath}`);
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
