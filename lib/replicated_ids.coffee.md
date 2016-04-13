    module.exports = ///
      ^

      (
        number:\d+@\S+    # local-number
      |
        number:\d+        # global-number
      |
        endpoint:\d+@\S+
      |
        number_domain:\S+
      )

      $
      ///
