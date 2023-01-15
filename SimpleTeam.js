// global vars
let teamsMap = new Map();           // team name -> {captains: [], members: []}
let playerTeamMap = new Map();      // xuid -> team name

const colors = ["§1", "§2", "§3", "§4", "§5", "§6", "§7", "§8", "§9", "§a", "§b", "§c", "§d", "§e"]


/////////////////////////////////////// Helpers ///////////////////////////////////////

Array.prototype.removeByValue = function (val) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] === val) {
            this.splice(i, 1);
            i--;
        }
    }
    return this;
}

function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
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

// 更改玩家名字颜色为队伍颜色
function colorPlayerName(xuid)
{
    let teamName = getPlayerTeam_Impl(xuid);
    if(teamName != null)
    {
        let color = teamName.substring(2,4);    // eg. $l$3NAME$r
        let pl = mc.getPlayer(xuid);
        if(pl)
            pl.rename("§l" + color + pl.realName + "§r");
    }
}

// 恢复玩家名字颜色
function recoverPlayerName(player)
{
    player.rename(player.realName);
}

// 创建队伍
function createTeam(creator, teamName, output)
{
    if(hasTeam_Impl(teamName))
        return output.error(`[SimpleTeam] 创建队伍${teamName}失败。队名已被占用`);
    
    let nowTeam = getPlayerTeam_Impl(creator.xuid);
    if(nowTeam)
        return output.error(`[SimpleTeam] 创建队伍失败。你已拥有队伍： ${nowTeam}`);
    
    teamName = "§l" + getRandomColor() + teamName + "§r";
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
        executer.sendModalForm("SimpleTeam 队伍解散确认",`你确定要解散队伍${teamName}吗？`
            ,"确定", "取消", function(teamName) 
        {
            return (player, result) =>
            {
                if(result)
                {
                    forEachTeamCaptain_Impl(teamName, xuid => {
                        let pl = mc.getPlayer(xuid);
                        if(pl)
                        {
                            recoverPlayerName(pl);
                            pl.tell(`[SimpleTeam] 队伍${teamName}已解散`)
                        }
                    });
                    forEachTeamMember_Impl(teamName, xuid => {
                        let pl = mc.getPlayer(xuid);
                        if(pl)
                        {
                            recoverPlayerName(pl);
                            pl.tell(`[SimpleTeam] 队伍${teamName}已解散`)
                        }
                    });
                    deleteTeam_Impl(teamName);
                    player.tell("[SimpleTeam] 队伍删除成功");
                }
            }
        }(teamName));
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
        colorPlayerName(playerXuid);
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
                                    {
                                        recoverPlayerName(pl);
                                        pl.tell(`[SimpleTeam] 队伍${playerOldTeam}已解散`);
                                    }
                                });

                                // 转移
                                transMember_Impl(playerXuid, true, playerOldTeam, newTeam);
    
                                // 发送结果
                                colorPlayerName(playerXuid);
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
                            colorPlayerName(playerXuid);
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
            colorPlayerName(playerXuid);
            playerAdd.tell(`[SimpleTeam] 你已被转移到${executerTeam}队伍`);
            let cnt = countTeamMembers_Impl(executerTeam) + countTeamCaptains_Impl(executerTeam);
            return output.success(`[SimpleTeam] 队伍增加玩家${playerAdd.name}成功\n[SimpleTeam] 现在队伍共拥有${cnt}人`);
        }
    }
}

// 移除队伍成员
function removeMember(executer, playerRemove, output)
{
    // if(executer.xuid == playerRemove.xuid)
    //     return output.error("[SimpleTeam] 无法将自己移出队伍。\n[SimpleTeam] 是否想用/team delete 解散队伍？");

    let executerTeam = getPlayerTeam_Impl(executer.xuid);
    if(executerTeam == null)
        return output.error("[SimpleTeam] 你不在任何队伍中，无法移除成员\n[SimpleTeam] 请先使用/team create <name> 创建一个队伍");
    
    let playerXuid = playerRemove.xuid;
    let playerOldTeam = getPlayerTeam_Impl(playerXuid);
    if(playerOldTeam != executerTeam)
        return output.error(`[SimpleTeam] 移除失败，玩家${playerRemove.name}不在此队伍中`);

    // 可以移除
    if(executer.xuid == playerRemove.xuid)
    {
        // 尝试移除自己
        if(countTeamCaptains_Impl(playerOldTeam) == 1)
        {
            // 自己是最后一位captain，如果remove则当前队伍解散
            executer.sendModalForm("SimpleTeam 成员移除确认",`你正在将自己移出队伍${executerTeam}\n如果确认移除，你现在的队伍将被解散。确认移除吗？`
                ,"确认", "取消", function(playerOldTeam) 
                {
                    return (executer, result) =>
                    {
                        if(result)
                        {
                            // 同意
                            // 向旧队员发消息
                            forEachTeamMember_Impl(playerOldTeam, xuid => {
                                let pl = mc.getPlayer(xuid);
                                if(pl)
                                {
                                    recoverPlayerName(pl);
                                    pl.tell(`[SimpleTeam] 队伍${playerOldTeam}已解散`);
                                }
                            });

                            // 解散队伍
                            deleteTeam_Impl(playerOldTeam);
                        }
                    }
                }(executerTeam));
        }
        else
        {
            // 不是最后一位captain，正常移除
            executer.sendModalForm("SimpleTeam 成员移除确认",`你正在将自己移出队伍${executerTeam}。确认移除吗？`
                ,"确认", "取消", function(playerOldTeam) 
            {
                return (executer, result) =>
                {
                    if(result)
                    {
                        // 同意
                        let playerXuid = executer.xuid;
                        // 提醒旧队队长
                        forEachTeamCaptain_Impl(playerOldTeam, xuid => {
                            let pl = mc.getPlayer(xuid);
                            if(pl && pl.xuid != executer.xuid)
                                pl.tell(`[SimpleTeam] 玩家${executer.name}已将自己移出队伍${playerOldTeam}`);
                        });
                        
                        // 移除
                        removeMember_Impl(playerXuid, true, playerOldTeam);

                        // 发送结果
                        recoverPlayerName(executer);
                        executer.tell(`[SimpleTeam] 你已离开队伍${playerOldTeam}`);                    
                    }
                }
            }(executerTeam));
        }
    }
    else
    {
        // 移除别人
        playerRemove.tell(`[SimpleTeam] 你已被移出队伍${executerTeam}`);
        removeMember_Impl(playerXuid, playerRemove.isOP(), executerTeam);

        recoverPlayerName(playerRemove);
        let cnt = countTeamMembers_Impl(executerTeam) + countTeamCaptains_Impl(executerTeam);
        return output.success(`[SimpleTeam] 移除成功\n[SimpleTeam] 现在队伍剩余${cnt}人`);
    }
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
                    {
                        recoverPlayerName(pl);
                        pl.tell(`[SimpleTeam] 你已被移出队伍${teamName}`)
                    }
                    removeMember_Impl(xuid, false, teamName);
                });
                forEachTeamCaptain_Impl(teamName, xuid => {
                    if(xuid == executerXuid)    // 不移除自己
                        return;
                    let pl = mc.getPlayer(xuid);
                    if(pl)
                    {
                        recoverPlayerName(pl);
                        pl.tell(`[SimpleTeam] 你已被移出队伍${teamName}`)
                    }
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
    return output.success(`[SimpleTeam] 队伍${executerTeam}中的所有成员为： ${members}`);
}

// 显示所有队伍
function ShowAllTeams(output)
{
    let teams = "";
    forEachTeam_Impl(teamName => {
        teams += teamName + ", ";
    });
    teams = teams.substring(0, teams.length - 2);

    if(teams != "")
        return output.success(`[SimpleTeam] 目前所有的队伍为： ${teams}`);
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
                    {
                        targets = res.player;
                        if(targets.length == 1 && targets[0].xuid == ori.player.xuid)      
                        {
                            // 如果add自己，则报错
                            return output.error("[SimpleTeam] 无法添加到队伍，因为你已经在此队伍中");
                        }
                        targets.removeByValue(ori.player);      // 如果使用选择器，移除自己
                        if(targets.length == 0)
                            return out.error("[SimpleTeam] 目标玩家不存在！");
                        for(let target of targets)
                            addMember(ori.player, target, out);
                        break;
                    }
                case "remove":
                    {
                        targets = res.player;
                        if(targets.length > 1)                  // 如果使用选择器，移除自己。特殊情况：remove自己
                            targets.removeByValue(ori.player);
                        if(targets.length == 0)
                            return out.error("[SimpleTeam] 目标玩家不存在！");
                        for(let target of targets)
                            removeMember(ori.player, target, out);
                    }
                    break;
                case "removeall":
                    removeAllMembers(ori.player, out);
                    break;
                case "list":
                    ShowMembers(ori.player, out);
                    break;
                case "showall":
                    ShowAllTeams(out);
                    break;
            }
        // } catch(err) {
        //     out.error(err + "");
        // }

        // debug
        // forEachTeam_Impl(team => {
        //     msg = "[" + team + "]\nCaptains:";
        //     forEachTeamCaptain_Impl(team, xuid => {
        //         msg += data.xuid2name(xuid) + ", "
        //     });
        //     msg = msg.substring(0, msg.length - 2);
        //     msg +="\nMembers:";
        //     forEachTeamMember_Impl(team, xuid => {
        //         msg += data.xuid2name(xuid) + ", "
        //     });
        //     msg = msg.substring(0, msg.length - 2);
        //     ori.player.tell(msg);
        // });
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
    teamCmd.setEnum("ListAction", ["list", "showall"])

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

// 玩家上线
function playerJoin(player)
{
    let xuid = player.xuid;
    playerOnline_Impl(xuid);
    colorPlayerName(player.xuid)
}

// 玩家下线
function playerLeft(player)
{
    playerOffline_Impl(player.xuid);
}

// 玩家攻击实体
function playerAttack(attacker, entity)
{
    if(entity.isPlayer())
    {
        let attackee = entity.toPlayer();
		let attackerTeam = getPlayerTeam_Impl(attacker.xuid);
		let attackeeTeam = getPlayerTeam_Impl(attackee.xuid);
        if(attackerTeam != null && attackerTeam == attackeeTeam)
        {
            // 拦截队内伤害
            attacker.sendText("队内伤害无效", 5);
            return false;
        }
    }
    return true;
}

// 实体受伤
function entityHurt(mob,source,damage,cause){
    if(mob && source && mob.isPlayer() && source.isPlayer())
    {
        let attacker = source.toPlayer()
        let attackee = mob.toPlayer();
        let attackerTeam = getPlayerTeam_Impl(attacker.xuid);
		let attackeeTeam = getPlayerTeam_Impl(attackee.xuid);
        if(attackerTeam != null && attackerTeam == attackeeTeam)
        {
            // 拦截队内伤害
            attacker.sendText("队内伤害无效", 5);
            return false;
        }
    }
    return true;
}

// main
function main()
{
    readFromFile();
    logger.info("SimpleTeam 已加载，开发者：yqs112358");
    logger.info("简单的组队游戏插件，有编队名字变色、队内伤害阻止等特性");
    logger.info("用法： /team create <名字>  创建队伍");
    logger.info("       /team delete         解散队伍");
    logger.info("       /team add <玩家>     邀请玩家加入队伍");
    logger.info("       /team remove <玩家>  将玩家移出队伍");
    logger.info("       /team removeall      将当前队伍中所有其他人移出");
    logger.info("       /team list           显示当前队伍中所有玩家");
    logger.info("       /team showall        显示当前所有的队伍");
    logger.info("       [注] 命令仅OP玩家可用");

    // 命令注册
    mc.listen("onServerStarted", () => {
        registerCmd();
    });

    // 监听玩家行为
    mc.listen("onJoin", playerJoin);
    mc.listen("onLeft", playerLeft);
    mc.listen("onAttackEntity", playerAttack);
    mc.listen("onMobHurt", entityHurt);
}

main();