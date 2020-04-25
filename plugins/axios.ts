import Vue from "vue";
import { NuxtAxiosInstance } from "@nuxtjs/axios";
import { AxiosRequestConfig } from "axios";
import decode from "jwt-decode";

const redirectErrors = ["unapproved-location", "missing-token"];
const ignoredErrors = ["no-customer"];

export default function({
  $axios,
  redirect,
  store
}: {
  $axios: NuxtAxiosInstance;
  redirect: any;
  store: {
    state: {
      auth: any;
    };
    dispatch: any;
  };
}) {
  $axios.interceptors.request.use(
    (config: AxiosRequestConfig) =>
      new Promise((resolve, reject) => {
        console.log("Axios request starting");
        // config.data = removeNulls(removeReadOnlyValues(config.data));
        $axios.setHeader("X-Requested-With", "XMLHttpRequest");

        // This is the Staart public API key
        if (process.env.API_KEY)
          $axios.setHeader("X-Api-Key",process.env.API_KEY);
        try {
          const token: string = config.headers.common.Authorization.replace(
            "Bearer ",
            ""
          );
          console.log("Got Axios token", token);
          if (
            decode<{ exp: number }>(token).exp * 1000 <
            new Date().getTime()
          ) {
            console.log("Axios token is expired");
            $axios.setHeader("Authorization", undefined);
            if (
              !store.state.auth.tokens.token ||
              !store.state.auth.tokens.refresh
            ) {
              console.log("Could not get token in store");
              return resolve(config);
            }
            console.log("Refreshing token");
            store
              .dispatch("auth/refresh")
              .then((newToken: string) => {
                console.log("Got new token", newToken);
                $axios.setHeader("Authorization", newToken);
                config.headers = {
                  ...config.headers,
                  Authorization: `Bearer ${newToken}`
                };
              })
              .catch(() => store.dispatch("auth/logout"))
              .then(() => resolve(config));
          } else {
            resolve(config);
          }
        } catch (error) {
          resolve(config);
        }
      })
  );
  // $axios.onResponse((response) => {
  //   if (response.data.success === true) {
  //     if (response.data.text) {
  //       Vue.notify({
  //         group: "auth",
  //         text: response.data.text,
  //         type: "notification notification--color-success",
  //       });
  //     } else if (response.data.message) {
  //       Vue.notify({
  //         group: "auth",
  //         text: messages[response.data.message] || messages.success,
  //         type: "notification notification--color-success",
  //       });
  //     } else {
  //       Vue.notify({
  //         group: "auth",
  //         text: messages.success,
  //         type: "notification notification--color-success",
  //       });
  //     }
  //   }
  // });
  $axios.onError(error => {
    if (!error.response) return;
    if (
      ["revoked-token", "invalid-token", "expired-token"].includes(
        error.response.data.code || error.response.data.error
      )
    ) {
      return redirect("/auth/refresh");
    }
    if (
      ignoredErrors.includes(
        error.response.data.code || error.response.data.error
      )
    ) {
    } else if (
      redirectErrors.includes(
        error.response.data.code || error.response.data.error
      )
    ) {
      return redirect(
        `/errors/${error.response.data.code || error.response.data.error}`
      );
    }
    // } else if (
    //   Object.keys(errors).includes(
    //     error.response.data.code || error.response.data.error
    //   )
    // ) {
    //   Vue.notify({
    //     group: "auth",
    //     text: errors[error.response.data.code || error.response.data.error],
    //     duration: 5000,
    //     type: "notification notification--color-danger",
    //   });
    // } else {
    //   Vue.notify({
    //     group: "auth",
    //     text: error.response.data.code || error.response.data.error,
    //     type: "notification notification--color-danger",
    //   });
    // }
  });
}
