// global vars
let teamsMap = new Map();           // team name -> {captains: [], members: []}
let playerTeamMap = new Map();      // xuid -> team name


/////////////////////////////////////// Helper ///////////////////////////////////////

Array.prototype.removeByValue = function (val) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] === val) {
            this.splice(i, 1);
            i--;
        }
    }
    return this;
}

function mapToObj(m){
    let res= Object.create(null);
    for (let[k,v] of m) {
        res[k] = v;
    }
    return res;
}

function objToMap(obj){
    let res = new Map();
    for (let k of Object.keys(obj)) {
        res.set(k, obj[k]);
    }
    return res;
}


/////////////////////////////////////// 持久化 ///////////////////////////////////////

// 保存
function saveToFile()
{
    File.writeTo("./plugins/SimpleTeam/TeamsMap.json", JSON.stringify(mapToObj(teamsMap)));
    File.writeTo("./plugins/SimpleTeam/PlayerTeamMap.json", JSON.stringify(mapToObj(playerTeamMap)));
}

// 解析
function readFromFile()
{
    try{
        if(File.exists("./plugins/SimpleTeam/TeamsMap.json"))
        {
            let obj = JSON.parse(File.readFrom("./plugins/SimpleTeam/TeamsMap.json"));
            teamsMap = objToMap(obj);
        }
        if(File.exists("./plugins/SimpleTeam/PlayerTeamMap.json"))
        {
            let obj = JSON.parse(File.readFrom("./plugins/SimpleTeam/PlayerTeamMap.json"));
            playerTeamMap = objToMap(obj);
        }
    }
    catch(err) {
        logger.error(`[SimpleTeam] Fail to parse data from file: ${err.message}`)
    }
}

/////////////////////////////////////// 队伍辅助 ///////////////////////////////////////

// 创建队伍
function newTeam_Impl(creatorXuid, teamName)
{
    let teamInfo = teamsMap.get(teamName);
    if(teamInfo == null)
    {
        teamsMap.set(teamName, {captains: [creatorXuid], members: []});  
        playerTeamMap.set(creatorXuid, teamName);
        saveToFile();
        return true;
    }
    else
        return null;
}

// 删除队伍
function deleteTeam_Impl(teamName)
{
    let teamInfo = teamsMap.get(teamName);
    if(teamInfo != null)
    {
        teamInfo.captains.forEach(xuid => {
            playerTeamMap.set(xuid, null);
        });
        teamInfo.members.forEach(xuid => {
            playerTeamMap.set(xuid, null);
        });
        teamsMap.delete(teamName);
        saveToFile();
        return true;
    }
    else return null;
}

// 判断队伍是否存在
function hasTeam_Impl(teamName)
{
    return teamsMap.has(teamName);
}

// 获取某人所在队伍
function getPlayerTeam_Impl(playerXuid)
{
    return playerTeamMap.get(playerXuid);
}

// 获取队员人数
function countTeamMembers_Impl(teamName)
{
    let teamInfo = teamsMap.get(teamName);
    if(teamInfo != null)
    {
        return teamInfo.members.length;
    }
    else return null;
}

// 获取队长人数
function countTeamCaptains_Impl(teamName)
{
    let teamInfo = teamsMap.get(teamName);
    if(teamInfo != null)
    {
        return teamInfo.captains.length;
    }
    else return null;
}

// 遍历队长
function forEachTeamCaptain_Impl(teamName, func)
{
    let teamInfo = teamsMap.get(teamName);
    if(teamInfo != null)
    {
        teamInfo.captains.forEach(xuid => { func(xuid); });
        return true;
    }
    else return null;
}

// 遍历成员
function forEachTeamMember_Impl(teamName, func)
{
    let teamInfo = teamsMap.get(teamName);
    if(teamInfo != null)
    {
        teamInfo.members.forEach(xuid => { func(xuid); });
        return true;
    }
    else return null;
}

// 遍历所有队伍
function forEachTeam_Impl(func)
{
    for(var [key, value] of teamsMap)
    {
        func(key);
    }
}

// 队伍增加成员
function addMember_Impl(playerXuid, isOP, teamName)
{
    let teamInfo = teamsMap.get(teamName);
    if(isOP)
        teamInfo.captains.push(playerXuid);
    else
        teamInfo.members.push(playerXuid);
    playerTeamMap.set(playerXuid, teamName);
    saveToFile();
}

// 队伍移除成员
function removeMember_Impl(playerXuid, isOP, teamName)
{
    let teamInfo = teamsMap.get(teamName)
    if(isOP)
    {
        if(teamInfo.captains.length == 1)
        {
            // 最后一位captain，前队伍解散
            teamInfo.members.forEach(xuid => {
                playerTeamMap.set(xuid, null);
            });
            teamsMap.delete(teamName);
        }
        else
        {
            // 从旧队中移除
            teamInfo.captains.removeByValue(playerXuid);
        }
    }
    else
    {
        // 从旧队中移除
        teamInfo.members.removeByValue(playerXuid);
    }
    playerTeamMap.set(playerXuid, null);
    saveToFile();
}

// 队伍转移成员
function transMember_Impl(playerXuid, isOP, oldTeam, newTeam)
{
    removeMember_Impl(playerXuid, isOP, oldTeam);
    addMember_Impl(playerXuid, isOP, newTeam);
}

// 玩家上线
function playerOnline_Impl(playerXuid)
{
    if(!playerTeamMap.has(playerXuid))
        playerTeamMap.set(playerXuid, null);
}

// 玩家下线
function playerOffline_Impl(playerXuid)
{
    ;
}


/////////////////////////////////////// 功能函数 ///////////////////////////////////////

// 创建队伍
function createTeam(creator, teamName, output)
{
    if(hasTeam_Impl(teamName))
        return output.error(`[SimpleTeam] 创建队伍${teamName}失败。队名已被占用`);
    
    let nowTeam = getPlayerTeam_Impl(creator.xuid);
    if(nowTeam)
        return output.error(`[SimpleTeam] 创建队伍失败。你已拥有队伍： ${nowTeam}`);
    
    newTeam_Impl(creator.xuid, teamName);    
    return output.success(`[SimpleTeam] 创建队伍${teamName}成功`);
}

// 删除队伍
function deleteTeam(executer, output)
{
    let teamName = getPlayerTeam_Impl(executer.xuid);
    if(teamName)
    {
        // 队伍存在
        forEachTeamCaptain_Impl(teamName, xuid => {
            let pl = mc.getPlayer(xuid);
            if(pl)
                pl.tell(`[SimpleTeam] 队伍${teamName}已解散`)
        });
        forEachTeamMember_Impl(teamName, xuid => {
            let pl = mc.getPlayer(xuid);
            if(pl)
                pl.tell(`[SimpleTeam] 队伍${teamName}已解散`)
        });
        deleteTeam_Impl(teamName);
        return output.success("[SimpleTeam] 队伍删除成功");
    }
    else
        return output.error("[SimpleTeam] 你不在任何队伍中，无法执行解散\n[SimpleTeam] 请先使用/team create <name> 创建一个队伍");
}

// 增加队伍成员
function addMember(executer, playerAdd, output)
{
    if(executer.xuid == playerAdd.xuid)
        return output.error("[SimpleTeam] 无法添加到队伍，因为你已经在此队伍中");

    let executerTeam = getPlayerTeam_Impl(executer.xuid);
    if(executerTeam == null)
        return output.error("[SimpleTeam] 你不在任何队伍中，无法新增成员\n[SimpleTeam] 请先使用/team create <name> 创建一个队伍");
    
    let playerXuid = playerAdd.xuid;
    let playerOldTeam = getPlayerTeam_Impl(playerXuid);
    if(playerOldTeam == executerTeam)
        return output.error(`[SimpleTeam] 无法添加到队伍，玩家${playerAdd.name}已经在此队伍中`);

    // 可以增加
    if(playerOldTeam == null)
    {
        // playerAdd不在其他队伍中，直接加入到队伍
        addMember_Impl(playerXuid, playerAdd.isOP(), executerTeam);

        // 发送结果
        playerAdd.tell(`[SimpleTeam] 你已被邀请进入队伍${executerTeam}`);
        let cnt = countTeamMembers_Impl(executerTeam) + countTeamCaptains_Impl(executerTeam);
        return output.success(`[SimpleTeam] 队伍邀请玩家${playerAdd.name}成功\n[SimpleTeam] 现在队伍共拥有${cnt}人`);
    }
    else
    {
        // playerAdd在其他队伍中
        if(playerAdd.isOP())
        {
            // playerAdd是OP，需要询问
            if(countTeamCaptains_Impl(playerOldTeam) == 1)
            {
                // 最后一位captain，如果add则他的前队伍将解散
                playerAdd.sendModalForm("SimpleTeam 队伍加入邀请",`${executer.name}邀请你进入他的队伍${executerTeam}\n如果同意加入，你现在的队伍将被解散。同意邀请吗？`
                    ,"同意", "拒绝", function(askerXuid, newTeam) 
                    {
                        return (playerAdd, result) =>
                        {
                            let asker = mc.getPlayer(askerXuid);
                            if(!result)
                            {
                                // 拒绝
                                if(asker)
                                    asker.tell(`[SimpleTeam] 玩家${playerAdd.name}拒绝了你的加入邀请`)
                            }
                            else
                            {
                                // 向旧队员发消息
                                let playerXuid = playerAdd.xuid;
                                let playerOldTeam = getPlayerTeam_Impl(playerXuid);
                                forEachTeamMember_Impl(playerOldTeam, xuid => {
                                    let pl = mc.getPlayer(xuid);
                                    if(pl)
                                        pl.tell(`[SimpleTeam] 队伍${playerOldTeam}已解散`)
                                });

                                // 转移
                                transMember_Impl(playerXuid, true, playerOldTeam, newTeam);
    
                                // 发送结果
                                playerAdd.tell(`[SimpleTeam] 你已被转移到${newTeam}队伍`);
                                let cnt = countTeamMembers_Impl(newTeam) + countTeamCaptains_Impl(newTeam);
                                if(asker)
                                    asker.tell(`[SimpleTeam] 队伍邀请玩家${playerAdd.name}成功\n[SimpleTeam] 现在队伍共拥有${cnt}人`);
                            }
                        }
                    }(executer.xuid, executerTeam));
            }
            else
            {
                // 不是最后一位captain，正常转移
                playerAdd.sendModalForm("SimpleTeam 队伍加入邀请",`${executer.name}邀请你进入他的队伍${executerTeam}。同意邀请吗？`
                    ,"同意", "拒绝", function(askerXuid, newTeam) 
                {
                    return (playerAdd, result) =>
                    {
                        let asker = mc.getPlayer(askerXuid);
                        if(!result)
                        {
                            // 拒绝
                            if(asker)
                                asker.tell(`[SimpleTeam] 玩家${playerAdd.name}拒绝了你的加入邀请`)
                        }
                        else
                        {
                            // 提醒旧队队长
                            let playerXuid = playerAdd.xuid;
                            let playerOldTeam = getPlayerTeam_Impl(playerXuid);
                            forEachTeamCaptain_Impl(playerOldTeam, xuid => {
                                let pl = mc.getPlayer(xuid);
                                if(pl)
                                    Player.tell(`[SimpleTeam] 玩家${playerAdd.name}已从你的队伍被转移到${newTeam}队伍`);
                            });
                            
                            // 转移
                            transMember_Impl(playerXuid, true, playerOldTeam, newTeam);

                            // 发送结果
                            playerAdd.tell(`[SimpleTeam] 你已被转移到${newTeam}队伍`);
                            let cnt = countTeamMembers_Impl(newTeam) + countTeamCaptains_Impl(newTeam);
                            if(asker)
                                asker.tell(`[SimpleTeam] 队伍邀请玩家${playerAdd.name}成功\n[SimpleTeam] 现在队伍共拥有${cnt}人`);
                        }
                    }
                }(executer.xuid, executerTeam));
            }
            executer.tell(`[SimpleTeam] 已向玩家${playerAdd.name}发出邀请信息`)
        }
        else
        {
            // playerAdd不是OP
            // 提醒旧队队长
            forEachTeamCaptain_Impl(playerOldTeam, xuid => {
                let pl = mc.getPlayer(xuid);
                if(pl)
                    pl.tell(`[SimpleTeam] 玩家${playerAdd.name}已从你的队伍被转移到${executerTeam}队伍`);
            });
            
            // 转移
            transMember_Impl(playerXuid, false, playerOldTeam, executerTeam);

            // 发送结果
            playerAdd.tell(`[SimpleTeam] 你已被转移到${executerTeam}队伍`);
            let cnt = countTeamMembers_Impl(executerTeam) + countTeamCaptains_Impl(executerTeam);
            return output.success(`[SimpleTeam] 队伍增加玩家${playerAdd.name}成功\n[SimpleTeam] 现在队伍共拥有${cnt}人`);
        }
    }
}

// 移除队伍成员
function removeMember(executer, playerRemove, output)
{
    if(executer.xuid == playerRemove.xuid)
        return output.error("[SimpleTeam] 无法将自己移出队伍。\n[SimpleTeam] 是否想用/team delete 解散队伍？");

    let executerTeam = getPlayerTeam_Impl(executer.xuid);
    if(executerTeam == null)
        return output.error("[SimpleTeam] 你不在任何队伍中，无法移除成员\n[SimpleTeam] 请先使用/team create <name> 创建一个队伍");
    
    let playerXuid = playerRemove.xuid;
    let playerOldTeam = getPlayerTeam_Impl(playerXuid);
    if(playerOldTeam != executerTeam)
        return output.error(`[SimpleTeam] 移除失败，玩家${playerRemove.name}不在此队伍中`);

    // 可以移除
    playerRemove.tell(`[SimpleTeam] 你已被移出队伍${executerTeam}`)
    removeMember_Impl(playerXuid, playerRemove.isOP(), executerTeam);
    let cnt = countTeamMembers_Impl(executerTeam) + countTeamCaptains_Impl(executerTeam);
    return output.success(`[SimpleTeam] 移除成功\n[SimpleTeam] 现在队伍剩余${cnt}人`);
}

// 移除所有队伍成员
function removeAllMembers(executer, output)
{
    let executerTeam = getPlayerTeam_Impl(executer.xuid);
    if(executerTeam == null)
        return output.error("[SimpleTeam] 你不在任何队伍中，无法移除成员\n[SimpleTeam] 请先使用/team create <name> 创建一个队伍");
    
    // 可以移除
    executer.sendModalForm("移除确认",`你确定要移除队伍${executerTeam}中的所有其他玩家吗？`
        ,"同意", "拒绝", function(executerXuid, teamName) 
    {
        return (player, result) =>
        {
            if(result)
            {
                // 同意
                forEachTeamMember_Impl(teamName, xuid => {
                    let pl = mc.getPlayer(xuid);
                    if(pl)
                        pl.tell(`[SimpleTeam] 你已被移出队伍${teamName}`)
                    removeMember_Impl(xuid, false, teamName);
                });
                forEachTeamCaptain_Impl(teamName, xuid => {
                    if(xuid == executerXuid)    // 不移除自己
                        return;
                    let pl = mc.getPlayer(xuid);
                    if(pl)
                        pl.tell(`[SimpleTeam] 你已被移出队伍${teamName}`)
                    removeMember_Impl(xuid, true, teamName);
                });
                player.tell("[SimpleTeam] 移除所有其他玩家成功");
            }
        }
    }(executer.xuid, executerTeam));
}

// 显示队伍中所有成员
function ShowMembers(executer, output)
{
    let executerTeam = getPlayerTeam_Impl(executer.xuid);
    if(executerTeam == null)
        return output.error("[SimpleTeam] 你不在任何队伍中\n[SimpleTeam] 请先使用/team create <name> 创建一个队伍");

    let members = ""
    forEachTeamCaptain_Impl(executerTeam, xuid => {
        members += data.xuid2name(xuid) + ", "
    });
    forEachTeamMember_Impl(executerTeam, xuid => {
        members += data.xuid2name(xuid) + ", "
    });
    members = members.substring(0, members.length - 2);
    return output.success(`[SimpleTeam] 队伍中的所有成员为： ${members}`);
}

// 显示所有队伍
function ListAllTeams(output)
{
    let teams = "";
    forEachTeam_Impl(teamName => {
        teams += teamName + ", ";
    });
    teams = teams.substring(0, teams.length - 2);

    if(teams != "")
        return output.success(`[SimpleTeam] 所有的队伍为： ${teams}`);
    else
        return output.success(`[SimpleTeam] 目前没有任何队伍`);
}

// 命令回调
function cmdCallback(_cmd, ori, out, res)
{
    if(ori.player)
    {
        // try
        // {
            let target = null;
            switch (res.action) {
                case "create":
                    createTeam(ori.player, res.name, out);
                    break;
                case "delete":
                    deleteTeam(ori.player, out);
                    break;
                case "add":
                    target = res.player[0];
                    if(!target)
                        return out.error("[SimpleTeam] 目标玩家不存在！");
                    addMember(ori.player, target, out);
                    break;
                case "remove":
                    target = res.player[0];
                    if(!target)
                        return out.error("[SimpleTeam] 目标玩家不存在！");
                    removeMember(ori.player, target, out);
                    break;
                case "removeall":
                    removeAllMembers(ori.player, out);
                    break;
                case "members":
                    ShowMembers(ori.player, out);
                    break;
                case "list":
                    ListAllTeams(out);
                    break;
            }
        // } catch(err) {
        //     out.error(err + "");
        // }

        // debug
        forEachTeam_Impl(team => {
            msg = "[" + team + "]\nCaptains:";
            forEachTeamCaptain_Impl(team, xuid => {
                msg += data.xuid2name(xuid) + ", "
            });
            msg = msg.substring(0, msg.length - 2);
            msg +="\nMembers:";
            forEachTeamMember_Impl(team, xuid => {
                msg += data.xuid2name(xuid) + ", "
            });
            msg = msg.substring(0, msg.length - 2);
            ori.player.tell(msg);
        });
    }
    return true;
}

// 注册命令
function registerCmd()
{
    let teamCmd = mc.newCommand("team", "SimpleTeam plugin", PermType.GameMasters, 0x80);
    teamCmd.setEnum("CreateAction", ["create"]);
    teamCmd.setEnum("DeleteAction", ["delete", "removeall"]);
    teamCmd.setEnum("MemberAction", ["add", "remove"])
    teamCmd.setEnum("ListAction", ["list", "members"])

    teamCmd.mandatory("action", ParamType.Enum, "CreateAction", "action1", 1);
    teamCmd.mandatory("action", ParamType.Enum, "DeleteAction", "action2", 1);
    teamCmd.mandatory("action", ParamType.Enum, "MemberAction", "action3", 1);
    teamCmd.mandatory("action", ParamType.Enum, "ListAction", "action4", 1)
    teamCmd.mandatory("name", ParamType.String);
    teamCmd.mandatory("player", ParamType.Player);

    teamCmd.overload(["CreateAction", "name"]);
    teamCmd.overload(["DeleteAction"]);
    teamCmd.overload(["MemberAction", "player"]);
    teamCmd.overload(["ListAction"]);

    teamCmd.setCallback(cmdCallback);
    teamCmd.setup();
}

// main
function main()
{
    readFromFile();
    logger.info("SimpleTeam loaded.");

    // 命令注册
    mc.listen("onServerStarted", () => {
        registerCmd();
    });

    // 监听上线
    mc.listen("onJoin", player=>{
        playerOnline_Impl(player.xuid);
    });

    // 监听下线
    mc.listen("onLeft", player=>{
        playerOffline_Impl(player.xuid);
    });
}

main();