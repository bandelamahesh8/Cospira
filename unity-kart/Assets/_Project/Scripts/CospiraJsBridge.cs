using System.Runtime.InteropServices;

public class CospiraJsBridge : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void PostMessageToParent(string json);

    public static void SendReady(string ugsPlayerId)
    {
        var payload = JsonUtility.ToJson(new ReadyMsg {
            type = "COSPIRA_READY",
            ugsPlayerId = ugsPlayerId
        });
        PostMessageToParent(payload);
    }

    public static void SendResult(RaceResultData result)
    {
        PostMessageToParent(JsonUtility.ToJson(result));
    }

    public static void SendExit()
    {
        PostMessageToParent("{\"type\":\"COSPIRA_EXIT\"}");
    }
}

[Serializable]
public class ReadyMsg
{
    public string type;
    public string ugsPlayerId;
}

[Serializable]
public class RaceResultData
{
    public string type = "COSPIRA_RESULT";
    public string playerId;
    public int position;
    public long bestLapMs;
    public long totalTimeMs;
    public int checkpointsHit;
}