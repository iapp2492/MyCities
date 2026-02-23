using System.Collections.Concurrent;

namespace MyCitiesWebApi.Testing;

public static class TransientFailureInjector
{
    private static readonly ConcurrentDictionary<string, int> RemainingFailuresByKey = new();

    public static void Arm(string key, int failuresToThrow)
    {
        RemainingFailuresByKey[key] = Math.Max(0, failuresToThrow);
    }

    public static bool ShouldFail(string key)
    {
        if (!RemainingFailuresByKey.TryGetValue(key, out var remaining))
        {
            return false;
        }

        if (remaining <= 0)
        {
            RemainingFailuresByKey.TryRemove(key, out _);
            return false;
        }

        RemainingFailuresByKey[key] = remaining - 1;
        return true;
    }
}
