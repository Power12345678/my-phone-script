<template>
  <div class="app-user">
    <div class="profile-header">
      <div class="avatar-large"></div>
      <h2>User Name</h2>
      <p>Bio goes here...</p>
    </div>
    <div class="stats">
      <div class="stat">
        <strong>100</strong>
        <span>Posts</span>
      </div>
      <div class="stat">
        <strong>200</strong>
        <span>Following</span>
      </div>
      <div class="stat">
        <strong>500</strong>
        <span>Followers</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-user { padding: 20px; }
.profile-header { display: flex; flex-direction: column; align-items: center; margin-bottom: 30px; }
.avatar-large { width: 100px; height: 100px; background-color: #ddd; border-radius: 50%; margin-bottom: 15px; }
.stats { display: flex; justify-content: space-around; border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 15px 0; }
.stat { display: flex; flex-direction: column; align-items: center; }
</style>
