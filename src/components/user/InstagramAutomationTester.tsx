import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { TestTube, MessageSquare, Film, UserPlus, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface InstagramAccount {
  id: string;
  instagram_username: string;
  account_name: string;
}

interface TestResult {
  triggered: boolean;
  triggerName: string;
  triggerId: string;
  triggerType: string;
  reason: string;
  dmMessage: string;
  publicReply?: string;
}

export const InstagramAutomationTester = () => {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [testType, setTestType] = useState<string>("comment");
  const [testData, setTestData] = useState({
    commentText: "",
    postId: "",
    storyReply: "",
    storyId: "",
    followerUsername: "",
    followerId: "",
  });
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { data, error } = await supabase
      .from("instagram_accounts")
      .select("id, instagram_username, account_name")
      .eq("user_id", session.session.user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch Instagram accounts",
      });
      return;
    }

    setAccounts(data || []);
    if (data && data.length > 0) {
      setSelectedAccount(data[0].id);
    }
  };

  const matchesKeyword = (text: string, keywords: string[], matchType: string, excludeKeywords: string[]): boolean => {
    const lowerText = text.toLowerCase();
    
    // Check exclude keywords first
    if (excludeKeywords && excludeKeywords.length > 0) {
      for (const exclude of excludeKeywords) {
        if (lowerText.includes(exclude.toLowerCase())) {
          return false;
        }
      }
    }

    if (!keywords || keywords.length === 0) return false;

    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      switch (matchType) {
        case 'exact':
          if (lowerText === lowerKeyword) return true;
          break;
        case 'starts_with':
          if (lowerText.startsWith(lowerKeyword)) return true;
          break;
        case 'contains':
        default:
          if (lowerText.includes(lowerKeyword)) return true;
          break;
      }
    }
    return false;
  };

  const testCommentAutomation = async () => {
    if (!testData.commentText) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter comment text",
      });
      return;
    }

    const { data: triggers } = await supabase
      .from("instagram_comment_triggers")
      .select("*")
      .eq("instagram_account_id", selectedAccount)
      .eq("is_active", true);

    if (!triggers || triggers.length === 0) {
      setTestResults([]);
      toast({
        title: "No Results",
        description: "No active comment triggers found",
      });
      return;
    }

    const results: TestResult[] = [];

    for (const trigger of triggers) {
      let matched = false;
      let reason = "";

      // Check trigger type
      if (trigger.trigger_type === 'post_specific' && trigger.post_id !== testData.postId) {
        continue;
      }

      if (trigger.trigger_type === 'all_comments') {
        matched = true;
        reason = "Trigger set to match all comments";
      }

      if (trigger.trigger_type === 'keyword') {
        if (matchesKeyword(
          testData.commentText,
          trigger.trigger_keywords || [],
          trigger.match_type,
          trigger.exclude_keywords || []
        )) {
          matched = true;
          reason = `Matched keyword(s): ${trigger.trigger_keywords.join(', ')} (${trigger.match_type} match)`;
        } else {
          reason = `No keyword match. Looking for: ${trigger.trigger_keywords?.join(', ') || 'none'}`;
        }
      }

      results.push({
        triggered: matched,
        triggerName: trigger.name,
        triggerId: trigger.id,
        triggerType: trigger.trigger_type,
        reason,
        dmMessage: trigger.dm_message,
        publicReply: trigger.public_reply_message,
      });
    }

    setTestResults(results);
  };

  const testStoryAutomation = async () => {
    if (!testData.storyReply) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter story reply text",
      });
      return;
    }

    const { data: triggers } = await supabase
      .from("instagram_story_triggers")
      .select("*")
      .eq("instagram_account_id", selectedAccount)
      .eq("is_active", true);

    if (!triggers || triggers.length === 0) {
      setTestResults([]);
      toast({
        title: "No Results",
        description: "No active story triggers found",
      });
      return;
    }

    const results: TestResult[] = [];

    for (const trigger of triggers) {
      let matched = false;
      let reason = "";

      if (trigger.trigger_type === 'all_story_replies') {
        matched = true;
        reason = "Trigger set to match all story replies";
      } else if (trigger.trigger_type === 'story_mentions' && testData.storyReply.includes('@')) {
        matched = true;
        reason = "Story reply contains a mention (@)";
      } else {
        reason = `Trigger type: ${trigger.trigger_type}`;
      }

      results.push({
        triggered: matched,
        triggerName: trigger.name,
        triggerId: trigger.id,
        triggerType: trigger.trigger_type,
        reason,
        dmMessage: trigger.dm_message,
      });
    }

    setTestResults(results);
  };

  const testFollowAutomation = async () => {
    if (!testData.followerUsername) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter follower username",
      });
      return;
    }

    const { data: triggers } = await supabase
      .from("instagram_follow_triggers")
      .select("*")
      .eq("instagram_account_id", selectedAccount)
      .eq("is_active", true);

    if (!triggers || triggers.length === 0) {
      setTestResults([]);
      toast({
        title: "No Results",
        description: "No active follow triggers found",
      });
      return;
    }

    const results: TestResult[] = triggers.map((trigger) => ({
      triggered: true,
      triggerName: trigger.name,
      triggerId: trigger.id,
      triggerType: "follow",
      reason: "Follow automation triggers for all new followers",
      dmMessage: trigger.dm_message,
    }));

    setTestResults(results);
  };

  const runTest = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      switch (testType) {
        case "comment":
          await testCommentAutomation();
          break;
        case "story":
          await testStoryAutomation();
          break;
        case "follow":
          await testFollowAutomation();
          break;
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Automation Tester
          </CardTitle>
          <CardDescription>
            Please connect an Instagram account first
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <TestTube className="h-4 w-4" />
        <AlertTitle>Testing Tool</AlertTitle>
        <AlertDescription>
          Test your automation rules without actually sending messages. This tool simulates triggers
          and shows which automations would be activated based on your test input.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Automation Tester
          </CardTitle>
          <CardDescription>
            Simulate Instagram interactions to preview automation triggers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Instagram Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      @{account.instagram_username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Test Type</Label>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comment
                    </div>
                  </SelectItem>
                  <SelectItem value="story">
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4" />
                      Story Reply
                    </div>
                  </SelectItem>
                  <SelectItem value="follow">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Follow
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {testType === "comment" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="commentText">Comment Text *</Label>
                <Textarea
                  id="commentText"
                  value={testData.commentText}
                  onChange={(e) => setTestData({ ...testData, commentText: e.target.value })}
                  placeholder="Enter test comment text..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="postId">Post ID (Optional)</Label>
                <Input
                  id="postId"
                  value={testData.postId}
                  onChange={(e) => setTestData({ ...testData, postId: e.target.value })}
                  placeholder="For post-specific triggers"
                />
              </div>
            </div>
          )}

          {testType === "story" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="storyReply">Story Reply Text *</Label>
                <Textarea
                  id="storyReply"
                  value={testData.storyReply}
                  onChange={(e) => setTestData({ ...testData, storyReply: e.target.value })}
                  placeholder="Enter test story reply text..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="storyId">Story ID (Optional)</Label>
                <Input
                  id="storyId"
                  value={testData.storyId}
                  onChange={(e) => setTestData({ ...testData, storyId: e.target.value })}
                  placeholder="Story identifier"
                />
              </div>
            </div>
          )}

          {testType === "follow" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="followerUsername">Follower Username *</Label>
                <Input
                  id="followerUsername"
                  value={testData.followerUsername}
                  onChange={(e) => setTestData({ ...testData, followerUsername: e.target.value })}
                  placeholder="@username"
                />
              </div>
              <div>
                <Label htmlFor="followerId">Follower ID (Optional)</Label>
                <Input
                  id="followerId"
                  value={testData.followerId}
                  onChange={(e) => setTestData({ ...testData, followerId: e.target.value })}
                  placeholder="Instagram user ID"
                />
              </div>
            </div>
          )}

          <Button onClick={runTest} disabled={loading} className="w-full">
            {loading ? "Testing..." : "Run Test"}
          </Button>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              {testResults.filter(r => r.triggered).length} of {testResults.length} triggers would be activated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <Card key={index} className={result.triggered ? "border-green-500" : "border-muted"}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {result.triggered ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <XCircle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{result.triggerName}</h3>
                          <Badge variant={result.triggered ? "default" : "secondary"}>
                            {result.triggered ? "Would Trigger" : "No Match"}
                          </Badge>
                        </div>
                        
                        <div className="text-sm space-y-2">
                          <div>
                            <span className="text-muted-foreground">Type: </span>
                            <span className="font-medium">{result.triggerType}</span>
                          </div>
                          
                          <div>
                            <span className="text-muted-foreground">Reason: </span>
                            <span>{result.reason}</span>
                          </div>
                          
                          {result.triggered && (
                            <>
                              <div className="mt-3 p-3 bg-muted rounded-md">
                                <div className="text-xs text-muted-foreground mb-1">DM Message:</div>
                                <div>{result.dmMessage}</div>
                              </div>
                              
                              {result.publicReply && (
                                <div className="mt-2 p-3 bg-muted rounded-md">
                                  <div className="text-xs text-muted-foreground mb-1">Public Reply:</div>
                                  <div>{result.publicReply}</div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {testResults.length === 0 && !loading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Results</AlertTitle>
          <AlertDescription>
            Run a test to see which automation rules would be triggered
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};