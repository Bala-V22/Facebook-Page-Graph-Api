import React, { useState, useEffect } from "react";
import { LoginSocialFacebook } from "reactjs-social-login";
import { FacebookLoginButton } from "react-social-login-buttons";
import axios from 'axios';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './App.css';

function App() {
  const [profile, setProfile] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [followersCount, setFollowersCount] = useState(null);
  const [impressionsCount, setImpressionsCount] = useState(null);
  const [engagementCount, setEngagementCount] = useState(null);
  const [reactionsCount, setReactionsCount] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [fetchingData, setFetchingData] = useState(false);
  const [pageAccessToken, setPageAccessToken] = useState(null);

  useEffect(() => {
    if (profile) {
      fetch(`https://graph.facebook.com/me/accounts?access_token=${profile.accessToken}`)
      .then(response => response.json())
      .then(data => {
        if (data.error) {
            console.error('Error fetching pages:', data.error.message);
            return;
        }
        setPages(data.data || []);
        })
        .catch(error => {
          console.error('Error fetching pages:', error);
        });
    }
  }, [profile]);

  const handlePageSelect = (event) => {
    const pageId = event.target.value;
    setSelectedPage(pageId);
    fetchPageAccessToken(pageId);
  };

  const fetchPageAccessToken = (pageId) => {
    fetch(`https://graph.facebook.com/v12.0/${pageId}?fields=access_token&access_token=${profile.accessToken}`)
    .then(response => response.json())
    .then(data => {
      setPageAccessToken(data.access_token);
      })
      .catch(error => {
        console.error('Error fetching page access token:', error);
        setPageAccessToken(null);
      });
  };

  useEffect(() => {
    if (pageAccessToken) {
      fetchPageDetails(selectedPage);
    }
  }, [pageAccessToken]);

  const fetchPageDetails = (pageId) => {
    setFetchingData(true);

    axios.get(`https://graph.facebook.com/v12.0/${pageId}?fields=fan_count&access_token=${pageAccessToken}`)
      .then(response => {
        const data = response.data;
        setFollowersCount(data.fan_count || 0);
      })
      .catch(error => {
      console.error('Error fetching followers count:', error);
      setFollowersCount(0);
      });

    const url = `https://graph.facebook.com/v20.0/${pageId}/insights?metric=page_impressions_unique,page_post_engagements,page_actions_post_reactions_like_total&access_token=${pageAccessToken}`;
    axios.get(url)
      .then(response => {
        const data = response.data;
        if (data.error) {
          console.error('Error fetching page insights:', data.error.message);
          setImpressionsCount(0);
          setEngagementCount(0);
          setReactionsCount(0);
        } else {
          const impressionsData = data.data.find(metric => metric.name === 'page_impressions_unique');
          const engagementData = data.data.find(metric => metric.name === 'page_post_engagements');
          const reactionsData = data.data.find(metric => metric.name === 'page_actions_post_reactions_like_total');

          setImpressionsCount(impressionsData?.values[0]?.value || 0);
          setEngagementCount(engagementData?.values[0]?.value || 0);
          setReactionsCount(reactionsData?.values[0]?.value || 0);
        }
      })
      .catch(error => {
        console.error('Error fetching page insights:', error);
        setImpressionsCount(0);
        setEngagementCount(0);
        setReactionsCount(0);
      })
        .finally(() => {
        setFetchingData(false);
      });
  };

  const fetchMetricsWithDateRange = () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    setFetchingData(true);

    const since = Math.floor(new Date(startDate).getTime() / 1000);
    const until = Math.floor(new Date(endDate).getTime() / 1000);

    const url = `https://graph.facebook.com/v20.0/${selectedPage}/insights?metric=page_impressions_unique,page_post_engagements,page_actions_post_reactions_like_total&since=${since}&until=${until}&access_token=${pageAccessToken}`;

    axios.get(url)
      .then(response => {
        const data = response.data;
        // console.log(url)
        if (data.error) {
          console.error('Error fetching page insights with date range:', data.error.message);
          setImpressionsCount(0);
          setEngagementCount(0);
          setReactionsCount(0);
        } else {
          const impressionsData = data.data.find(metric => metric.name === 'page_impressions_unique');
          const engagementData = data.data.find(metric => metric.name === 'page_post_engagements');
          const reactionsData = data.data.find(metric => metric.name === 'page_actions_post_reactions_like_total');

          setImpressionsCount(impressionsData?.values.reduce((sum, value) => sum + value.value, 0) || 0);
          setEngagementCount(engagementData?.values.reduce((sum, value) => sum + value.value, 0) || 0);
          setReactionsCount(reactionsData?.values.reduce((sum, value) => sum + value.value, 0) || 0);
        }
      })
      .catch(error => {
        console.error('Error fetching page insights with date range:', error);
        setImpressionsCount(0);
        setEngagementCount(0);
        setReactionsCount(0);
      })
      .finally(() => {
        // console.log('finally')
        axios.get(`https://graph.facebook.com/v12.0/${selectedPage}?fields=fan_count&since=${since}&until=${until}&access_token=${pageAccessToken}`)
          .then(response => {
            // console.log(url)
            const data = response.data;
            setFollowersCount(data.fan_count || 0);
          })
          .catch(error => {
            console.error('Error fetching followers count with date range:', error);
            setFollowersCount(0);
          })
          .finally(() => {
            setFetchingData(false);
          });
      });
  };

  return (
    <div className="container">
      {!profile ? (
        <LoginSocialFacebook
          appId="395439796285117"
          onResolve={(response) => {
            setProfile(response.data);
          }}
          onReject={(error) => {
            console.log('Facebook login error:', error);
          }}
          scope="read_insights,pages_show_list,pages_read_engagement,pages_manage_posts"
        >
          <FacebookLoginButton />
        </LoginSocialFacebook>
      ) : (
        <div className="profile">
          <img src={profile.picture.data.url} alt="Profile" className="profile-pic" />
          <h1>{profile.name}</h1>
        </div>
      )}

      {profile && pages.length > 0 && (
        <>
          <div className="select-page">
            <select onChange={handlePageSelect}>
              <option value="">Select a Page</option>
              {pages.map(page => (
                <option key={page.id} value={page.id}>{page.name}</option>
              ))}
            </select>
          </div>

          {selectedPage && (
            <>
              <div className="cards">
                <div className="card">
                  <h2>Total Followers</h2>
                  <p>{fetchingData ? 'Loading...' : (followersCount ?? 0)}</p>
                </div>
                <div className="card">
                  <h2>Total Engagement</h2>
                  <p>{fetchingData ? 'Loading...' : (engagementCount ?? 0)}</p>
                </div>
                <div className="card">
                  <h2>Total Impressions</h2>
                  <p>{fetchingData ? 'Loading...' : (impressionsCount ?? 0)}</p>
                </div>
                <div className="card">
                  <h2>Total Reactions</h2>
                  <p>{fetchingData ? 'Loading...' : (reactionsCount ?? 0)}</p>
                </div>
              </div>

              <div className="date-range">
                <h2>Select Date Range</h2>
                <div className="date-picker">
                  <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} placeholderText="Start Date" />
                  <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} placeholderText="End Date" />
                </div>
                <button onClick={fetchMetricsWithDateRange} disabled={!startDate || !endDate || fetchingData}>
                  {fetchingData ? 'Fetching...' : 'Fetch Metrics'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
