// Third party
import sanitizeHtml from 'sanitize-html'

// Configurations
import { DO_SPACE_ENDPOINT, DO_SPACE_BUCKET } from '../config'

const sanitizeBody = (body) => {
  return sanitizeHtml(body, {
    allowedAttributes: {
      iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
      img: ['src', 'width', 'height'],
      audio: ['controls', 'src'],
      video: ['controls', 'width', 'height', 'style', 'src', 'poster'],
      span: ['style'],
      p: ['style']
    },
    allowedIframeHostnames: ['www.youtube.com'],
    allowedSchemesByTag: {
      img: ['https'],
      iframe: ['https'],
      video: ['https'],
      audio: ['https']
    },
    allowedStyles: {
      '*': {
        'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
        'text-decoration': [/^underline$/],
        'padding-left': [/[0-9]{1,4}px$/]
      },
      span: {
        'background-color': [/^rgb\([0-9]{0,3}, [0-9]{0,3}, [0-9]{0,3}\)$/]
      }
    },
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'iframe',
      'img',
      'audio',
      'video'
    ]),
    disallowedTagsMode: 'escape',
    transformTags: {
      'video': sanitizeHtml.simpleTransform(
          'video',
          {width: '77%', height: 'auto'}
        ),
    },
    exclusiveFilter: (frame) => {
      // Only allow images, audio, and video tags with DistNode static src
      if (
        frame.tag === 'img' ||
        frame.tag === 'audio' ||
        frame.tag === 'video'
      ) {
        const re = new RegExp(
          `^(https:\\/\\/${DO_SPACE_BUCKET}\\.${DO_SPACE_ENDPOINT.replace(
            '.',
            '\\.'
          )}\\/uploads\\/([A-Za-z0-9\\-\\._~:\\/\\?#\\[\\]@!$&'\\(\\)\\*\\+,;\\=]*)?)$`
        )
        if (!re.test(frame.attribs.src)) {
          console.log('Filtering out', frame.attribs.src)
        }
        return !re.test(frame.attribs.src)
      }
    },
    selfClosing: ['img', 'audio', 'video']
  })
}

export { sanitizeBody }
