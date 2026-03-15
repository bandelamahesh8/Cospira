public class CospiraSessionData : MonoBehaviour
{
    public static CospiraSessionData Instance { get; private set; }

    private Dictionary<ulong, CospiraPlayerData> playerData = new();

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    public void SetPlayerData(ulong clientId, CospiraPlayerData data)
    {
        playerData[clientId] = data;
    }

    public CospiraPlayerData GetPlayerData(ulong clientId)
    {
        return playerData.ContainsKey(clientId) ? playerData[clientId] : null;
    }
}

[Serializable]
public class CospiraPlayerData
{
    public string userId;
    public string username;
    public string avatarUrl;
    public string kartSkin;
    public string trailEffect;
}